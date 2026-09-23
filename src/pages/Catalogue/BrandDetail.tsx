import { useParams } from "react-router-dom";
import { ProductListingPage } from "./ProductListingPage";
export function BrandDetail() { const { slug } = useParams(); return <ProductListingPage kind="brand" slug={slug} />; }
