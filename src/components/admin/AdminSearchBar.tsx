import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search, Building2, Users, CreditCard, X } from "lucide-react";

interface SearchResult {
  id: string;
  type: "organization" | "user" | "subscription";
  title: string;
  subtitle?: string;
}

interface AdminSearchBarProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
}

export function AdminSearchBar({
  onSelect,
  placeholder = "Search organizations, users, subscriptions...",
}: AdminSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Mock search results - in real app, this would be a debounced API call
  const results: SearchResult[] = query
    ? [
        {
          id: "1",
          type: "organization",
          title: "Acme Restaurant",
          subtitle: "restaurant • Professional",
        },
        {
          id: "2",
          type: "user",
          title: "John Doe",
          subtitle: "john@acme.com • org_admin",
        },
        {
          id: "3",
          type: "subscription",
          title: "Hotel Premium Subscription",
          subtitle: "Enterprise • $299/mo",
        },
      ]
    : [];

  const icons = {
    organization: Building2,
    user: Users,
    subscription: CreditCard,
  };

  return (
    <>
      <Button
        variant="outline"
        className="w-full max-w-sm justify-start text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {placeholder}
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {results.length > 0 && (
            <>
              <CommandGroup heading="Organizations">
                {results
                  .filter((r) => r.type === "organization")
                  .map((result) => {
                    const Icon = icons[result.type];
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => {
                          onSelect?.(result);
                          setOpen(false);
                        }}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
              <CommandGroup heading="Users">
                {results
                  .filter((r) => r.type === "user")
                  .map((result) => {
                    const Icon = icons[result.type];
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => {
                          onSelect?.(result);
                          setOpen(false);
                        }}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
              <CommandGroup heading="Subscriptions">
                {results
                  .filter((r) => r.type === "subscription")
                  .map((result) => {
                    const Icon = icons[result.type];
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => {
                          onSelect?.(result);
                          setOpen(false);
                        }}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          {result.subtitle && (
                            <span className="text-xs text-muted-foreground">
                              {result.subtitle}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
