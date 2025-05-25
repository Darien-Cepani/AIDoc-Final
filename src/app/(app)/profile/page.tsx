
"use client"

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card"; // Minimal card for header
import { Input } from "@/components/ui/input";
import { useAuth, type UserProfileData } from "@/contexts/AuthContext"; 
import { Loader2, User as UserIconProfile, Edit3, Save, Cake, VenetianMask, Ruler, Weight, ShieldAlert, Asterisk, Upload, Palette, CalendarIcon, HeartPulse, BrainIcon, Activity, Flame } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form"; 
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"; 
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, differenceInYears, isValid, parse, formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FullMedicalChart } from '@/components/medical-chart/FullMedicalChart'; // Import the new component
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter } from "@/components/ui/dialog"; 
import { ScrollArea } from "@/components/ui/scroll-area";


function getInitials(name: string = ""): string {
  const names = name.split(' ');
  let initials = names[0]?.substring(0, 1).toUpperCase() || "";
  if (names.length > 1) {
    initials += names[names.length - 1]?.substring(0, 1).toUpperCase() || "";
  }
  return initials || "U";
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").readonly(),
  height: z.coerce.number().min(0, "Height must be positive.").optional().nullable(),
  weight: z.coerce.number().min(0, "Weight must be positive.").optional().nullable(),
  gender: z.string().optional().nullable(),
  birthday: z.string()
    .optional()
    .nullable()
    .refine(val => {
      if (!val || val === "") return true; 
      const date = parse(val, 'dd/MM/yyyy', new Date());
      return isValid(date) && format(date, 'dd/MM/yyyy') === val && differenceInYears(new Date(), date) >= 0 && differenceInYears(new Date(), date) <= 120;
    }, "Invalid date. Please use DD/MM/YYYY format, ensure it's realistic, or leave empty."),
  existingConditions: z.string().optional().nullable(), 
  allergies: z.string().optional().nullable(),
  profilePictureUrl: z.string().url("Invalid URL format for profile picture.").optional().nullable(),
  dailyCalorieGoal: z.coerce.number().min(500, "Goal must be at least 500 calories.").max(10000, "Goal seems too high.").optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;


export default function ProfilePage() {
  const { user, loading, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getInitialBirthdayString = (userData: typeof user | null): string | undefined => {
    if (userData?.birthday) {
      try {
        const dateObj = parseISO(userData.birthday);
        if (isValid(dateObj)) {
          return format(dateObj, "dd/MM/yyyy");
        }
      } catch (e) { return undefined; }
    }
    return undefined;
  };
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "", 
      email: user?.email || "", 
      height: user?.height ?? undefined, 
      weight: user?.weight ?? undefined, 
      gender: user?.gender ?? undefined,
      birthday: getInitialBirthdayString(user), 
      existingConditions: user?.existingConditions?.join(", ") || "", 
      allergies: user?.allergies?.join(", ") || "", 
      profilePictureUrl: user?.profilePictureUrl || null,
      dailyCalorieGoal: user?.dailyCalorieGoal ?? undefined,
    },
  });
  

  useEffect(() => {
    if (user && !form.formState.isDirty) { 
      form.reset({
        name: user.name || "",
        email: user.email || "",
        height: user.height ?? undefined,
        weight: user.weight ?? undefined,
        gender: user.gender ?? undefined,
        birthday: getInitialBirthdayString(user),
        existingConditions: user.existingConditions?.join(", ") || "",
        allergies: user.allergies?.join(", ") || "",
        profilePictureUrl: user.profilePictureUrl || null,
        dailyCalorieGoal: user.dailyCalorieGoal ?? undefined,
      });
      setPreviewImage(user.profilePictureUrl || null);
    }
  }, [user, isEditModalOpen, form]); 

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user) return <div className="text-center p-8">Please log in to view your profile.</div>;
  
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
        form.setValue('profilePictureUrl', reader.result as string, { shouldValidate: true, shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const onSubmit = async (data: ProfileFormValues) => {
    let birthdayISO: string | null = null; 
    if (data.birthday && data.birthday.trim() !== "") {
        const parsedDate = parse(data.birthday, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate) && differenceInYears(new Date(), parsedDate) >= 0 && differenceInYears(new Date(), parsedDate) <= 120) {
            birthdayISO = formatISO(parsedDate);
        } else {
            form.setError("birthday", { type: "manual", message: "Invalid or unrealistic date." });
            return;
        }
    }
    
    let newCalculatedAge: number | null = null;
    if (birthdayISO) {
        const birthDateObj = parseISO(birthdayISO);
        if (isValid(birthDateObj)) {
            newCalculatedAge = differenceInYears(new Date(), birthDateObj);
        }
    }

    const profileDataToUpdate: Partial<UserProfileData> & {name: string, profilePictureUrl?: string | null} = { 
      name: data.name,
      height: data.height ?? null,
      weight: data.weight ?? null,
      gender: data.gender || null,
      birthday: birthdayISO,
      age: newCalculatedAge,
      existingConditions: data.existingConditions?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
      allergies: data.allergies?.split(",").map(s => s.trim()).filter(Boolean) ?? [],
      profilePictureUrl: data.profilePictureUrl || null,
      dailyCalorieGoal: data.dailyCalorieGoal ?? null,
    };

    try {
      await updateUserProfile(profileDataToUpdate);
      toast({ title: "Profile Updated", description: "Your profile information has been saved successfully.", variant: "default", iconType: "success" });
      setIsEditModalOpen(false);
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Update Failed", description: "Could not update your profile. Please try again.", variant: "destructive", iconType: "error" });
    }
  };


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Medical Chart</h1>
        <Button onClick={() => setIsEditModalOpen(true)} variant="outline" className="transition-all hover:shadow-md glassmorphic">
          <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
        </Button>
      </div>
      
      <FullMedicalChart user={user} />

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl glassmorphic h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal and medical information.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow custom-scrollbar -mx-1 pr-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative group flex-shrink-0">
                     { /* Avatar logic for edit modal */ }
                  </div>
                  <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} placeholder="Your full name" className="glassmorphic"/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
                
                 <FormField control={form.control} name="profilePictureUrl" render={({ field }) => (
                    <FormItem className="flex flex-col items-center">
                        <FormLabel>Profile Picture</FormLabel>
                        <img src={previewImage || user.profilePictureUrl || `https://avatar.vercel.sh/${user.email || user.id}.png?text=${getInitials(user.name)}`} alt="Preview" className="w-24 h-24 rounded-full object-cover mb-2 border" data-ai-hint="profile image"/>
                        <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="glassmorphic">
                            <Upload className="mr-2 h-4 w-4"/> Change Picture
                        </Button>
                        <Input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                         <FormControl><Input {...field} value={field.value ?? ""} type="text" className="hidden" /></FormControl> {/* To store URL if manually entered */}
                        <FormMessage />
                    </FormItem>
                )} />


                <Separator />
                <h3 className="text-md font-semibold">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="birthday" render={({ field }) => ( 
                        <FormItem className="flex flex-col"> 
                        <FormLabel className="flex items-center"><Cake className="h-4 w-4 mr-1.5 text-muted-foreground" /> Birthday</FormLabel> 
                        <FormControl>
                          <Input
                            placeholder="DD/MM/YYYY"
                            {...field} 
                            value={field.value ?? ""}
                            onChange={(e) => {
                            let inputValue = e.target.value.replace(/\D/g, ''); 
                            if (inputValue.length > 8) inputValue = inputValue.slice(0, 8);
                            let formattedValue = '';
                            if (inputValue.length > 0) formattedValue = inputValue.slice(0, 2);
                            if (inputValue.length >= 3) formattedValue += '/' + inputValue.slice(2, 4);
                            if (inputValue.length >= 5) formattedValue += '/' + inputValue.slice(4, 8);
                            field.onChange(formattedValue);
                            }}
                            maxLength={10}
                            className="glassmorphic"
                          />
                        </FormControl>
                        <FormMessage /> 
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="gender" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><VenetianMask className="h-4 w-4 mr-1.5 text-muted-foreground" /> Gender</FormLabel> <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl> 
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        </FormControl> 
                        <SelectContent> 
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem> 
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem> 
                        </SelectContent> 
                        </Select><FormMessage /> </FormItem>)} />
                </div>

                <Separator />
                <h3 className="text-md font-semibold">Physical Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="height" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Ruler className="h-4 w-4 mr-1.5 text-muted-foreground" /> Height (cm)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 175" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} className="glassmorphic"/></FormControl> <FormMessage /> </FormItem>)} />
                     <FormField control={form.control} name="weight" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Weight className="h-4 w-4 mr-1.5 text-muted-foreground" /> Weight (kg)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} className="glassmorphic"/></FormControl> <FormMessage /> </FormItem>)} />
                     <FormField control={form.control} name="dailyCalorieGoal" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Flame className="h-4 w-4 mr-1.5 text-muted-foreground" /> Daily Calorie Goal (kcal)</FormLabel> <FormControl><Input type="number" placeholder="e.g., 2000" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))} className="glassmorphic"/></FormControl> <FormMessage /> </FormItem>)} />
                </div>

                <Separator />
                <h3 className="text-md font-semibold">Medical History</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="existingConditions" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><ShieldAlert className="h-4 w-4 mr-1.5 text-muted-foreground" /> Existing Conditions</FormLabel> <FormControl><Textarea placeholder="e.g., Asthma, Type 2 Diabetes (comma-separated)" {...field} value={field.value ?? ""} rows={3} className="glassmorphic custom-scrollbar"/></FormControl> <FormMessage /> </FormItem>)} />
                    <FormField control={form.control} name="allergies" render={({ field }) => ( <FormItem> <FormLabel className="flex items-center"><Asterisk className="h-4 w-4 mr-1.5 text-muted-foreground" /> Allergies</FormLabel> <FormControl><Textarea placeholder="e.g., Penicillin, Peanuts (comma-separated)" {...field} value={field.value ?? ""} rows={3} className="glassmorphic custom-scrollbar"/></FormControl> <FormMessage /> </FormItem>)} />
                </div>
                 <DialogModalFooter className="mt-auto pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Changes
                  </Button>
                </DialogModalFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    

    