import { useParams } from "react-router-dom";
import { ProductListingPage } from "./ProductListingPage";
export function ModelDetail() { const { slug } = useParams(); return <ProductListingPage kind="model" slug={slug} />; }
