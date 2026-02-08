import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Building2, Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Search className="w-10 h-10 text-primary" />
        </div>

        {/* Error Code */}
        <div>
          <h1 className="text-7xl font-display font-bold text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mt-2">Page not found</p>
        </div>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed">
          The page <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{location.pathname}</code> doesn't exist.
          It may have been moved or deleted.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/">
            <Button className="gap-2 w-full sm:w-auto">
              <Home className="h-4 w-4" />
              Go to Home
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Suggested Links */}
        <div className="pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">Popular pages:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
            <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
            <Link to="/docs"><Button variant="ghost" size="sm">Documentation</Button></Link>
            <Link to="/auth"><Button variant="ghost" size="sm">Sign In</Button></Link>
          </div>
        </div>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-2 pt-4 text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span className="text-sm font-medium">OmniBiz Connect</span>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
