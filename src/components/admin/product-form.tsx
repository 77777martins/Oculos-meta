"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/providers/toast";
import { apiFetch, ApiClientError } from "@/lib/http/client";
import { parseBRLToCents } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validation/catalog";
import { Panel } from "./ui";
import { ImageUploadButton } from "./image-upload";

/**
 * No formulário, preços são digitados em reais (texto) e convertidos para centavos no envio;
 * a validação usa o MESMO productSchema do servidor sobre o payload convertido.
 */
type FormVariant = Omit<ProductInput["variants"][number], "priceCents" | "salePriceCents"> & { price: string; salePrice: string };
type FormValues = Omit<ProductInput, "variants"> & { variants: FormVariant[] };

const toReais = (c: number | null | undefined) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

export function ProductForm({ productId, initial, categories }: { productId?: string; initial?: ProductInput; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    defaultValues: initial
      ? { ...initial, variants: initial.variants.map((v) => ({ ...v, price: toReais(v.priceCents), salePrice: toReais(v.salePriceCents) })) }
      : {
          name: "",
          slug: "",
          brand: "Meta",
          model: "",
          shortDescription: "",
          description: "",
          specs: [],
          status: "DRAFT",
          isFeatured: false,
          categoryId: null,
          seoTitle: "",
          seoDescription: "",
          images: [],
          variants: [{ sku: "", name: "Padrão", color: "", colorHex: null, lens: "", size: "", price: "", salePrice: "", weightGrams: 300, isActive: true, initialStock: 0 }],
        },
  });
  const variants = useFieldArray({ control: form.control, name: "variants" });
  const specs = useFieldArray({ control: form.control, name: "specs" });
  const images = useFieldArray({ control: form.control, name: "images" });
  const { register, formState } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const payload: ProductInput = {
      ...values,
      categoryId: values.categoryId || null,
      variants: values.variants.map(({ price, salePrice, ...v }) => ({
        ...v,
        colorHex: v.colorHex || null,
        priceCents: parseBRLToCents(price) ?? 0,
        salePriceCents: salePrice.trim() ? parseBRLToCents(salePrice) : null,
        weightGrams: Number(v.weightGrams),
        initialStock: v.id ? undefined : Number(v.initialStock ?? 0),
      })),
    };
    // Validação local com o MESMO schema do servidor (o servidor revalida tudo).
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setServerError(`${first?.path.join(".")}: ${first?.message}`);
      return;
    }
    try {
      const res = await apiFetch<{ id: string }>(productId ? `/api/admin/products/${productId}` : "/api/admin/products", { method: productId ? "PUT" : "POST", body: payload });
      toast.success(productId ? "Produto atualizado" : "Produto criado");
      if (!productId) router.replace(`/admin/produtos/${res.id}`);
      router.refresh();
    } catch (e) {
      const err = e as ApiClientError;
      setServerError(err.fieldErrors ? Object.entries(err.fieldErrors).map(([k, v]) => `${k}: ${v[0]}`).join(" · ") : err.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {serverError && (
        <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Informações">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nome"
                {...register("name", { onBlur: (e) => !form.getValues("slug") && form.setValue("slug", slugify(e.target.value)) })}
                error={formState.errors.name?.message}
              />
              <Input label="Slug (URL)" {...register("slug")} hint="Ex.: ray-ban-meta-wayfarer" />
              <Input label="Marca" {...register("brand")} />
              <Input label="Modelo" {...register("model")} />
              <Textarea className="sm:col-span-2" label="Descrição curta" rows={2} maxLength={300} {...register("shortDescription")} />
              <Textarea className="sm:col-span-2" label="Descrição completa" rows={8} {...register("description")} hint="Texto puro; quebras de linha são preservadas." />
            </div>
          </Panel>

          <Panel title="Variantes, preços e estoque" actions={<Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => variants.append({ sku: "", name: "", color: "", colorHex: null, lens: "", size: "", price: "", salePrice: "", weightGrams: 300, isActive: true, initialStock: 0 })}>Variante</Button>}>
            <div className="space-y-4">
              {variants.fields.map((field, i) => {
                const isNew = !form.getValues(`variants.${i}.id`);
                return (
                  <fieldset key={field.id} className="grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-4">
                    <legend className="sr-only">Variante {i + 1}</legend>
                    <Input label="SKU" {...register(`variants.${i}.sku`)} />
                    <Input label="Nome" {...register(`variants.${i}.name`)} placeholder="Preto fosco / Lente G15" />
                    <Input label="Cor" {...register(`variants.${i}.color`)} />
                    <Input label="Cor (hex)" placeholder="#000000" {...register(`variants.${i}.colorHex`)} />
                    <Input label="Lentes" {...register(`variants.${i}.lens`)} />
                    <Input label="Tamanho" {...register(`variants.${i}.size`)} />
                    <Input label="Preço (R$)" inputMode="decimal" {...register(`variants.${i}.price`)} />
                    <Input label="Preço promocional (R$)" inputMode="decimal" {...register(`variants.${i}.salePrice`)} />
                    <Input label="Peso (g)" type="number" {...register(`variants.${i}.weightGrams`, { valueAsNumber: true })} />
                    {isNew ? (
                      <Input label="Estoque inicial" type="number" min={0} {...register(`variants.${i}.initialStock`, { valueAsNumber: true })} />
                    ) : (
                      <p className="self-end pb-3 text-xs text-slate-500">Estoque: use “Ajustar estoque” abaixo.</p>
                    )}
                    <Checkbox className="self-end pb-3" label="Ativa" {...register(`variants.${i}.isActive`)} />
                    <div className="flex items-end justify-end">
                      <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => variants.remove(i)} disabled={variants.fields.length === 1}>
                        Remover
                      </Button>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </Panel>

          <Panel title="Especificações técnicas" actions={<Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => specs.append({ label: "", value: "" })}>Especificação</Button>}>
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Cadastre somente informações verificadas em fontes oficiais do fabricante.</p>
            {specs.fields.length === 0 && <p className="text-sm text-slate-500">Nenhuma especificação cadastrada.</p>}
            <div className="space-y-3">
              {specs.fields.map((f, i) => (
                <div key={f.id} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
                  <Input aria-label="Nome da especificação" placeholder="Ex.: Câmera" {...register(`specs.${i}.label`)} />
                  <Input aria-label="Valor" placeholder="Valor verificado" {...register(`specs.${i}.value`)} />
                  <Button size="sm" variant="ghost" onClick={() => specs.remove(i)} aria-label="Remover especificação" icon={<Trash2 className="size-4" />} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Publicação">
            <div className="space-y-4">
              <Select label="Status" {...register("status")}>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="ARCHIVED">Arquivado</option>
              </Select>
              <Select label="Categoria" {...register("categoryId")}>
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Checkbox label="Destaque na página inicial" {...register("isFeatured")} />
              <Button type="submit" className="w-full" loading={formState.isSubmitting}>
                {productId ? "Salvar alterações" : "Criar produto"}
              </Button>
            </div>
          </Panel>

          <Panel title="Imagens" actions={<ImageUploadButton folder="products" label="Enviar" onUploaded={(url) => images.append({ url, alt: form.getValues("name") || "Imagem do produto" })} />}>
            <p className="mb-3 text-xs text-slate-500">Use apenas imagens próprias, oficiais autorizadas ou licenciadas. A primeira é a capa.</p>
            {images.fields.length === 0 && <p className="text-sm text-slate-500">Nenhuma imagem.</p>}
            <ul className="space-y-3">
              {images.fields.map((img, i) => (
                <li key={img.id} className="flex items-center gap-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    <Image src={form.getValues(`images.${i}.url`)} alt="" fill sizes="56px" className="object-cover" />
                  </div>
                  <Input className="flex-1" aria-label="Texto alternativo" placeholder="Texto alternativo" {...register(`images.${i}.alt`)} />
                  <div className="flex flex-col">
                    <button type="button" className="p-1 text-slate-500 hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => images.move(i, i - 1)} aria-label="Mover para cima">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" className="p-1 text-slate-500 hover:text-ink disabled:opacity-30" disabled={i === images.fields.length - 1} onClick={() => images.move(i, i + 1)} aria-label="Mover para baixo">
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <button type="button" className="p-1 text-slate-500 hover:text-red-600" onClick={() => images.remove(i)} aria-label="Remover imagem">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="SEO">
            <div className="space-y-4">
              <Input label="Título SEO" maxLength={70} {...register("seoTitle")} />
              <Textarea label="Descrição SEO" maxLength={160} rows={3} {...register("seoDescription")} />
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
