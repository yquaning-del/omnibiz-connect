import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, UtensilsCrossed, Pill, Store, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessVertical, VERTICAL_CONFIG } from '@/types';
import { Badge } from '@/components/ui/badge';

const getVerticalIcon = (vertical: BusinessVertical) => {
  switch (vertical) {
    case 'restaurant': return UtensilsCrossed;
    case 'hotel': return Building2;
    case 'pharmacy': return Pill;
    case 'retail': return Store;
    default: return Store;
  }
};

interface LocationSwitcherProps {
  collapsed?: boolean;
}

export function LocationSwitcher({ collapsed }: LocationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const { 
    organizations, 
    locations, 
    currentOrganization, 
    currentLocation,
    setCurrentOrganization,
    setCurrentLocation,
    hasRole,
  } = useAuth();

  const isSuperAdmin = hasRole('super_admin');

  // Group locations by organization
  const groupedLocations = organizations.map(org => ({
    org,
    locations: locations.filter(loc => loc.organization_id === org.id),
  }));

  const handleSelect = (locationId: string) => {
    // Find the selected location
    const selectedLocation = locations.find(loc => loc.id === locationId);
    if (selectedLocation) {
      // Find the parent organization
      const parentOrg = organizations.find(org => org.id === selectedLocation.organization_id);
      
      // Update the context
      setCurrentLocation(selectedLocation);
      if (parentOrg) {
        setCurrentOrganization(parentOrg);
      }
      
      // Store in localStorage for persistence
      localStorage.setItem('currentLocationId', locationId);
      if (parentOrg) {
        localStorage.setItem('currentOrganizationId', parentOrg.id);
      }
    }
    setOpen(false);
  };

  const currentVertical = currentLocation?.vertical || currentOrganization?.primary_vertical || 'retail';
  const VerticalIcon = isSuperAdmin ? Shield : getVerticalIcon(currentVertical);
  const verticalConfig = VERTICAL_CONFIG[currentVertical];

  if (collapsed) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-10 h-10 rounded-xl',
              `bg-${verticalConfig.color}/20`
            )}
          >
            <VerticalIcon className={cn('w-5 h-5', `text-${verticalConfig.color}`)} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" side="right">
          <Command>
            <CommandInput placeholder="Search locations..." />
            <CommandList>
              <CommandEmpty>No locations found.</CommandEmpty>
              {groupedLocations.map(({ org, locations: orgLocations }) => (
                <CommandGroup key={org.id} heading={org.name}>
                  {orgLocations.map((location) => {
                    const LocationIcon = getVerticalIcon(location.vertical);
                    const isSelected = currentLocation?.id === location.id;
                    
                    return (
                      <CommandItem
                        key={location.id}
                        value={location.id}
                        onSelect={() => handleSelect(location.id)}
                        className="flex items-center gap-3 py-2"
                      >
                        <LocationIcon className={cn(
                          'w-4 h-4',
                          `text-${VERTICAL_CONFIG[location.vertical].color}`
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{location.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {location.city || VERTICAL_CONFIG[location.vertical].name}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              `bg-${verticalConfig.color}/20`
            )}>
              <VerticalIcon className={cn('w-5 h-5', `text-${verticalConfig.color}`)} />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-semibold text-foreground truncate max-w-[140px]">
                {currentOrganization?.name || 'Select Location'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {currentLocation?.name || verticalConfig.name}
                </span>
                {isSuperAdmin && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search locations..." />
          <CommandList>
            <CommandEmpty>No locations found.</CommandEmpty>
            {groupedLocations.map(({ org, locations: orgLocations }) => (
              <CommandGroup key={org.id} heading={org.name}>
                {orgLocations.map((location) => {
                  const LocationIcon = getVerticalIcon(location.vertical);
                  const isSelected = currentLocation?.id === location.id;
                  const locConfig = VERTICAL_CONFIG[location.vertical];
                  
                  return (
                    <CommandItem
                      key={location.id}
                      value={`${location.name} ${location.city || ''}`}
                      onSelect={() => handleSelect(location.id)}
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        `bg-${locConfig.color}/20`
                      )}>
                        <LocationIcon className={cn(
                          'w-4 h-4',
                          `text-${locConfig.color}`
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-foreground">{location.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {location.city ? `${location.city} • ` : ''}{locConfig.name}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  window.location.href = '/settings';
                }}
                className="gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add new location</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}