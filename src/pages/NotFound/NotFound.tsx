import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export function NotFound() {
  return (
    <div className="container mx-auto py-24 px-4 text-center min-h-[60vh] flex flex-col justify-center items-center">
      <Helmet>
        <title>Page non trouvée | Telephonic Pro</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-3xl font-semibold mb-6">Page introuvable</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        Désolé, la page que vous recherchez n'existe pas, a été supprimée ou l'URL est incorrecte.
      </p>
      
      <div className="flex gap-4">
        <Link 
          to="/" 
          className="bg-primary text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          Retour à l'accueil
        </Link>
        <Link 
          to="/products" 
          className="bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-6 py-3 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors font-medium"
        >
          Voir la boutique
        </Link>
      </div>
    </div>
  );
}
