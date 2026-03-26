import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminDataTable, Column, StatusBadge } from "@/components/admin/AdminDataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  User,
  MoreHorizontal,
  Eye,
  KeyRound,
  Ban,
  Mail,
  Building2,
  Calendar,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface UserWithMeta {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  organizations: { id: string; name: string; role: string }[];
  roles: string[];
  last_sign_in?: string;
}

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithMeta[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithMeta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with pagination
      const { data: profiles, count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      // Fetch user roles
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role, organization_id");

      // Fetch organizations
      const { data: organizations } = await supabase
        .from("organizations")
        .select("id, name");

      const orgMap = new Map(organizations?.map((org) => [org.id, org.name]) || []);

      // Build users with meta
      const usersWithMeta: UserWithMeta[] = (profiles || []).map((profile) => {
        const userRoleEntries = userRoles?.filter((r) => r.user_id === profile.id) || [];
        const roles = [...new Set(userRoleEntries.map((r) => r.role))];
        const orgs = userRoleEntries
          .filter((r) => r.organization_id)
          .map((r) => ({
            id: r.organization_id!,
            name: orgMap.get(r.organization_id!) || "Unknown",
            role: r.role,
          }));

        return {
          id: profile.id,
          email: profile.email || "",
          full_name: profile.full_name || "Unknown",
          created_at: profile.created_at,
          organizations: orgs,
          roles,
        };
      });

      // Filter by role if needed
      let filteredUsers = usersWithMeta;
      if (roleFilter !== "all") {
        filteredUsers = usersWithMeta.filter((u) => u.roles.includes(roleFilter));
      }

      setUsers(filteredUsers);
      setTotal(count || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: UserWithMeta) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: "bg-destructive/20 text-destructive",
      org_admin: "bg-primary/20 text-primary",
      location_manager: "bg-accent/20 text-accent",
      staff: "bg-muted text-muted-foreground",
      pharmacist: "bg-success/20 text-success",
      front_desk: "bg-info/20 text-info",
    };
    return colors[role] || "bg-muted text-muted-foreground";
  };

  const columns: Column<UserWithMeta>[] = [
    {
      key: "user",
      header: "User",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.full_name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.slice(0, 2).map((role) => (
            <Badge key={role} className={getRoleBadgeColor(role)}>
              {role.replace("_", " ")}
            </Badge>
          ))}
          {row.roles.length > 2 && (
            <Badge variant="outline">+{row.roles.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "organizations",
      header: "Organizations",
      cell: (row) => (
        <div className="space-y-1">
          {row.organizations.slice(0, 2).map((org) => (
            <p key={org.id} className="text-sm">
              {org.name}
            </p>
          ))}
          {row.organizations.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{row.organizations.length - 2} more
            </p>
          )}
          {row.organizations.length === 0 && (
            <span className="text-muted-foreground">None</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.created_at), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewUser(row)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem>
              <KeyRound className="h-4 w-4 mr-2" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Ban className="h-4 w-4 mr-2" />
              Suspend User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">
            Manage all users across the platform
          </p>
        </div>

        <AdminDataTable
          columns={columns}
          data={users}
          loading={loading}
          searchPlaceholder="Search users by name or email..."
          onSearch={(query) => {
            console.log("Search:", query);
          }}
          pagination={{
            page,
            pageSize,
            total,
            onPageChange: setPage,
          }}
          onRefresh={fetchUsers}
          filters={
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="location_manager">Location Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                <SelectItem value="front_desk">Front Desk</SelectItem>
              </SelectContent>
            </Select>
          }
          onRowClick={handleViewUser}
        />

        {/* User Detail Panel */}
        <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
          <SheetContent className="w-full sm:max-w-md">
            {selectedUser && (
              <>
                <SheetHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="text-xl">
                        {selectedUser.full_name}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Roles
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.roles.map((role) => (
                        <Badge key={role} className={getRoleBadgeColor(role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {role.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Organizations
                    </h4>
                    <div className="space-y-2">
                      {selectedUser.organizations.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{org.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {org.role}
                          </Badge>
                        </div>
                      ))}
                      {selectedUser.organizations.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                          Not assigned to any organization
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Joined:</span>
                      <span>
                        {format(new Date(selectedUser.created_at), "PPP")}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Actions</h4>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm">
                        <KeyRound className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                      <Button variant="destructive" size="sm">
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
