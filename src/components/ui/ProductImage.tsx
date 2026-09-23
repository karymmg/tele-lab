import { type CSSProperties, type ReactNode, useState } from "react";
import { Package } from "lucide-react";
import { getProductImageCandidates } from "@/utils/productImage";
import "./ProductImage.css";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  style?: CSSProperties;
  fallback?: ReactNode;
};

/** Displays public Google Drive share links as image URLs and retries once before fallback. */
export function ProductImage({ src, alt, className, loading = "lazy", style, fallback }: ProductImageProps) {
  const candidates = getProductImageCandidates(src);
  const [failed, setFailed] = useState<{ source: string; index: number }>({ source: "", index: 0 });
  const source = src?.trim() || "";
  const index = failed.source === source ? failed.index : 0;
  const imageUrl = candidates[index];

  if (!imageUrl) {
    return fallback ?? (
      <div className="tl-product-image-fallback" role="img" aria-label={alt + " — image indisponible"}>
        <Package size={32} aria-hidden="true" />
        <span>Photo indisponible</span>
      </div>
    );
  }

  return (
    <img
      key={imageUrl}
      src={imageUrl}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      style={style}
      onError={() => setFailed({ source, index: index + 1 })}
    />
  );
}
