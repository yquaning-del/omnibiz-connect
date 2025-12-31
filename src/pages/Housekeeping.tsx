import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  BedDouble,
  Loader2,
} from "lucide-react";

interface HousekeepingTask {
  id: string;
  location_id: string;
  room_id: string | null;
  assigned_to: string | null;
  task_type: string;
  priority: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  room?: {
    room_number: string;
    room_type: string;
    floor: number;
  };
  assignee?: {
    full_name: string;
  };
}

interface HotelRoom {
  id: string;
  room_number: string;
  room_type: string;
  floor: number;
  housekeeping_status: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

const Housekeeping = () => {
  const { currentLocation } = useAuth();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    room_id: "",
    assigned_to: "",
    task_type: "cleaning",
    priority: "normal",
    scheduled_date: new Date(),
    scheduled_time: "",
    notes: "",
  });

  useEffect(() => {
    if (currentLocation) {
      fetchData();
      subscribeToTasks();
    }
  }, [currentLocation]);

  const fetchData = async () => {
    if (!currentLocation) return;
    setLoading(true);

    const [tasksRes, roomsRes, staffRes] = await Promise.all([
      supabase
        .from("housekeeping_tasks")
        .select("*")
        .eq("location_id", currentLocation.id)
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("hotel_rooms")
        .select("id, room_number, room_type, floor, housekeeping_status")
        .eq("location_id", currentLocation.id),
      supabase.from("profiles").select("id, full_name"),
    ]);

    if (tasksRes.data) {
      // Enrich tasks with room and assignee info
      const enrichedTasks = tasksRes.data.map((task) => {
        const room = roomsRes.data?.find((r) => r.id === task.room_id);
        const assignee = staffRes.data?.find((s) => s.id === task.assigned_to);
        return { ...task, room, assignee };
      });
      setTasks(enrichedTasks);
    }
    if (roomsRes.data) setRooms(roomsRes.data);
    if (staffRes.data) setStaff(staffRes.data);

    setLoading(false);
  };

  const subscribeToTasks = () => {
    if (!currentLocation) return;

    const channel = supabase
      .channel("housekeeping-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "housekeeping_tasks",
          filter: `location_id=eq.${currentLocation.id}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreateTask = async () => {
    if (!currentLocation) return;

    const { error } = await supabase.from("housekeeping_tasks").insert({
      location_id: currentLocation.id,
      room_id: formData.room_id || null,
      assigned_to: formData.assigned_to || null,
      task_type: formData.task_type,
      priority: formData.priority,
      scheduled_date: format(formData.scheduled_date, "yyyy-MM-dd"),
      scheduled_time: formData.scheduled_time || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task created successfully" });
      setDialogOpen(false);
      resetForm();
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("housekeeping_tasks")
      .update(updates)
      .eq("id", taskId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task updated" });
    }
  };

  const handleUpdateRoomStatus = async (roomId: string, status: string) => {
    const { error } = await supabase
      .from("hotel_rooms")
      .update({ housekeeping_status: status })
      .eq("id", roomId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Room status updated" });
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: "",
      assigned_to: "",
      task_type: "cleaning",
      priority: "normal",
      scheduled_date: new Date(),
      scheduled_time: "",
      notes: "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "normal":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoomStatusColor = (status: string) => {
    switch (status) {
      case "clean":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cleaning":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "dirty":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "inspection":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const filteredTasks =
    filterStatus === "all"
      ? tasks
      : tasks.filter((t) => t.status === filterStatus);

  const taskStats = {
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    total: tasks.length,
  };

  const roomStats = {
    clean: rooms.filter((r) => r.housekeeping_status === "clean").length,
    cleaning: rooms.filter((r) => r.housekeeping_status === "cleaning").length,
    dirty: rooms.filter((r) => r.housekeeping_status === "dirty").length,
    total: rooms.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Housekeeping Dashboard</h1>
          <p className="text-muted-foreground">
            Manage cleaning tasks and room status
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Housekeeping Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select
                  value={formData.room_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, room_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(v) =>
                    setFormData({ ...formData, assigned_to: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(v) =>
                      setFormData({ ...formData, task_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="deep_clean">Deep Clean</SelectItem>
                      <SelectItem value="turnover">Room Turnover</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) =>
                      setFormData({ ...formData, priority: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.scheduled_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_date
                          ? format(formData.scheduled_date, "PPP")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_date}
                        onSelect={(date) =>
                          date &&
                          setFormData({ ...formData, scheduled_date: date })
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <Button className="w-full" onClick={handleCreateTask}>
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              awaiting action
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Sparkles className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              tasks finished
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms Need Cleaning</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roomStats.dirty}</div>
            <p className="text-xs text-muted-foreground">
              of {roomStats.total} total rooms
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tasks found
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <BedDouble className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {task.room
                              ? `Room ${task.room.room_number}`
                              : "General Task"}
                          </span>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(task.priority)}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="capitalize">
                            {task.task_type.replace("_", " ")}
                          </span>
                          {task.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {task.assignee.full_name}
                            </span>
                          )}
                          <span>
                            {format(new Date(task.scheduled_date), "MMM d")}
                            {task.scheduled_time && ` at ${task.scheduled_time}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusColor(task.status)}
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleUpdateStatus(task.id, v)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Room Status Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                Room Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">Room {room.room_number}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {room.room_type} · Floor {room.floor}
                      </p>
                    </div>
                    <Select
                      value={room.housekeeping_status}
                      onValueChange={(v) => handleUpdateRoomStatus(room.id, v)}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-24 h-8",
                          getRoomStatusColor(room.housekeeping_status)
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clean">Clean</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                        <SelectItem value="dirty">Dirty</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Room Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clean</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500">
                    {roomStats.clean}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Cleaning</span>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                    {roomStats.cleaning}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dirty</span>
                  <Badge variant="outline" className="bg-red-500/10 text-red-500">
                    {roomStats.dirty}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Housekeeping;
