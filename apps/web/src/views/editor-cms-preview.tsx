import { toArticle, toArticleCategory, toAuthor, toFaq } from "@three-acts/content";
import { toProduct, toProductCategory } from "@three-acts/ecommerce";
import type { CmsDraftPreview, CmsPreviewCollection, CmsPreviewRecord, CmsRecord } from "@three-acts/cms-schema";
import { relatedArticles, relatedProducts } from "../content/related";
import { extractShopSlugs } from "../components/blog/pieces-mentioned";
import { Section } from "../components/layout/section";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { ProductGallery } from "../components/shop/product-gallery";
import { ProductPage } from "./shop/ProductPage";
import { ShopCategoryPage } from "./shop/ShopCategoryPage";
import { BlogPostPage } from "./blog/BlogPostPage";
import { AuthorPage } from "./blog/AuthorPage";
import { BlogCategoryPage } from "./blog/BlogCategoryPage";

/** Placeholders exist only in this render model. Source controls and the
 * authenticated store retain their original, possibly incomplete values. */
function renderRecord(record: CmsPreviewRecord, collectionId: CmsPreviewCollection): CmsRecord {
  const values = { ...record.values };
  if (collectionId !== "faqs" && collectionId !== "testimonials") {
    if (typeof values.slug !== "string" || !values.slug.trim()) values.slug = `__preview_${record.id}`;
    const name = collectionId === "products" || collectionId === "articles" ? "title" : "name";
    if (typeof values[name] !== "string" || !String(values[name]).trim()) values[name] = `Untitled ${collectionId === "products" ? "product" : collectionId === "articles" ? "article" : collectionId === "authors" ? "author" : "category"}`;
  }
  return { id: record.id, values, publishStatus: "draft", createdAt: "", modifiedAt: "", liveValues: null };
}

export function CmsDraftPreviewView({ preview }: { preview: CmsDraftPreview }) {
  const products = preview.collections.products.map(record => toProduct(renderRecord(record, "products")));
  const categories = preview.collections["product-categories"].map(record => toProductCategory(renderRecord(record, "product-categories")));
  const articles = preview.collections.articles.map(record => toArticle(renderRecord(record, "articles"))).filter(article => article !== null);
  const authors = preview.collections.authors.map(record => toAuthor(renderRecord(record, "authors"))).filter(author => author !== null);
  const articleCategories = preview.collections["article-categories"].map(record => toArticleCategory(renderRecord(record, "article-categories"))).filter(category => category !== null);
  const faqs = preview.collections.faqs.map(record => toFaq(renderRecord(record, "faqs"))).filter(faq => faq !== null);
  const raw = preview.collections[preview.collectionId].find(record => record.id === preview.recordId);
  if (!raw) throw new Error("This CMS item is no longer available.");
  const name = preview.collectionId === "products" || preview.collectionId === "articles" ? raw.values.title : raw.values.name;
  const incomplete = typeof name !== "string" || !name.trim() || typeof raw.values.slug !== "string" || !raw.values.slug.trim();
  let page;
  switch (preview.collectionId) {
    case "products": {
      const product = products.find(product => product.id === preview.recordId)!;
      const category = categories.find(category => category.slug === product.categorySlug);
      const breadcrumbItems = [{ label: "Shop", href: "/shop" }, ...(category ? [{ label: category.name, href: `/shop/category/${category.slug}` }] : []), { label: product.title }];
      page = <>
        <Section.Root><Section.Container>
          <Breadcrumb.Root items={breadcrumbItems} className="mb-8"/>
          <div className="grid gap-x-gap gap-y-gap-y landscape:grid-cols-2">
            <ProductGallery cmsSource={{ collectionId: "products", recordId: product.id, label: product.title }} images={product.images} title={product.title}/>
            <div className="flex flex-col gap-6">
              <ProductPage.Header product={product} category={category}/>
              <ProductPage.Pricing product={product}/>
              <Button.Root disabled title="Purchases are available on the published site">Add to cart</Button.Root>
              <ProductPage.Details product={product} category={category}/>
            </div>
          </div>
        </Section.Container></Section.Root>
        <ProductPage.Questions faqs={faqs}/><ProductPage.Related products={relatedProducts(product, products, 3)}/>
      </>;
      break;
    }
    case "articles": {
      const article = articles.find(article => article.id === preview.recordId)!;
      const shopProducts = extractShopSlugs(article.body).map(slug => products.find(product => product.slug === slug)).filter(product => product !== undefined).slice(0, 3);
      page = <BlogPostPage article={article} author={authors.find(author => author.slug === article.authorSlug)} category={articleCategories.find(category => category.slug === article.categorySlug)} categories={articleCategories} related={relatedArticles(article, articles, 3)} shopProducts={shopProducts}/>;
      break;
    }
    case "authors": {
      const author = authors.find(author => author.id === preview.recordId)!;
      page = <AuthorPage author={author} articles={articles.filter(article => article.authorSlug === author.slug)} categories={articleCategories}/>;
      break;
    }
    case "product-categories": {
      const category = categories.find(category => category.id === preview.recordId)!;
      page = <ShopCategoryPage category={category} products={products.filter(product => product.categorySlug === category.slug)}/>;
      break;
    }
    case "article-categories": {
      const category = articleCategories.find(category => category.id === preview.recordId)!;
      const counts: Record<string, number> = {};
      for (const article of articles) counts[article.categorySlug] = (counts[article.categorySlug] ?? 0) + 1;
      page = <BlogCategoryPage category={category} categories={articleCategories} articles={articles.filter(article => article.categorySlug === category.slug)} counts={counts} totalCount={articles.length}/>;
      break;
    }
  }
  return <>{incomplete && <p role="status" className="border-b border-line bg-block px-gutter py-3 text-small">This draft uses preview placeholders for its missing title or slug. Complete those fields in the CMS source.</p>}{page}</>;
}
