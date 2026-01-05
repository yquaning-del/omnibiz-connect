import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSettings() {
  const { language, setLanguage, t, languages } = useLanguage();

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          {t('settings.language.title')}
        </CardTitle>
        <CardDescription>{t('settings.language.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>{t('settings.language.select')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {languages.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  'relative h-auto py-4 px-4 justify-start',
                  language === lang.code && 'border-primary bg-primary/10'
                )}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold text-foreground">{lang.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                </div>
                {language === lang.code && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                )}
              </Button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            {t('settings.language.current')}: <span className="font-medium text-foreground">{languages.find(l => l.code === language)?.nativeName}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
