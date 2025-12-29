import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Customer } from '@/types';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Users,
  Loader2,
  Edit,
  Trash2,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  Star,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Customers() {
  const { currentOrganization } = useAuth();
  const { toast } = useToast();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    if (!currentOrganization) return;
    fetchCustomers();
  }, [currentOrganization]);

  const fetchCustomers = async () => {
    if (!currentOrganization) return;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', currentOrganization.id)
      .order('full_name');

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data as Customer[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormNotes('');
    setEditingCustomer(null);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.full_name);
    setFormEmail(customer.email || '');
    setFormPhone(customer.phone || '');
    setFormAddress(customer.address || '');
    setFormNotes(customer.notes || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setSaving(true);

    try {
      const customerData = {
        full_name: formName.trim(),
        email: formEmail.trim() || null,
        phone: formPhone.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
        organization_id: currentOrganization.id,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Customer updated successfully' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) throw error;
        toast({ title: 'Customer created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete "${customer.full_name}"?`)) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Customer deleted' });
      fetchCustomers();
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="123 Main St, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Customer preferences, allergies, etc."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingCustomer ? (
                  'Update Customer'
                ) : (
                  'Create Customer'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mb-4" />
            <p>No customers found</p>
            <p className="text-sm">Add your first customer to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => (
            <Card key={customer.id} className="border-border/50 bg-card/50 hover:bg-card transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">
                      {customer.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(customer)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteCustomer(customer)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-medium text-foreground mb-2">{customer.full_name}</h3>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">{customer.loyalty_points}</span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
