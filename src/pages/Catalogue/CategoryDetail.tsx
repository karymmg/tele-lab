import { useParams } from "react-router-dom";
import { ProductListingPage } from "./ProductListingPage";
export function CategoryDetail() { const { slug } = useParams(); return <ProductListingPage kind="category" slug={slug} />; }
