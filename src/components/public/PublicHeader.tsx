import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2 } from 'lucide-react';

interface PublicHeaderProps {
  orgName: string;
  logoUrl?: string;
  showBack?: boolean;
  backPath?: string;
  rightContent?: React.ReactNode;
}

export function PublicHeader({ orgName, logoUrl, showBack, backPath, rightContent }: PublicHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => backPath ? navigate(backPath) : navigate(-1)}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground">{orgName}</h1>
        </div>
        {rightContent}
      </div>
    </header>
  );
}
