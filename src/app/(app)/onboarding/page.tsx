
"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth, type UserProfileData } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO, isValid, differenceInYears, parse, formatISO } from "date-fns";
import { Loader2, Save, ArrowLeft, ArrowRight, CheckCircle, Ruler, Scale, Mars, Venus, PenSquare, User as UserIcon, UserRound, Flame } from "lucide-react"; 
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter } from "@/components/ui/dialog"; 
import { Textarea } from "@/components/ui/textarea";

const personalInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  birthday: z.string()
    .min(10, "Date of birth must be in DD/MM/YYYY format.")
    .max(10, "Date of birth must be in DD/MM/YYYY format.")
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Date of birth must be in DD/MM/YYYY format.")
    .refine(val => {
      const date = parse(val, 'dd/MM/yyyy', new Date());
      return isValid(date) && format(date, 'dd/MM/yyyy') === val && differenceInYears(new Date(), date) >= 0 && differenceInYears(new Date(), date) <= 120;
    }, "Invalid date. Please ensure the day, month, and year are correct and realistic."),
  gender: z.enum(["male", "female"], { required_error: "Please select your gender." }),
});

const physicalMetricsSchema = z.object({ 
  height: z.coerce.number().min(50, "Height must be at least 50cm.").max(300, "Please enter a valid height in cm.").optional().nullable(),
  weight: z.coerce.number().min(1, "Weight must be at least 1kg.").max(500, "Please enter a valid weight in kg.").optional().nullable(),
});

const medicalHistorySchema = z.object({
  existingConditions: z.string().optional(), 
  allergies: z.string().optional(), 
  dailyCalorieGoal: z.coerce.number().min(500, "Goal must be at least 500 calories.").max(10000, "Goal seems too high.").optional().nullable(),
});

const onboardingSchema = personalInfoSchema.merge(physicalMetricsSchema).merge(medicalHistorySchema);
type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, title: "Personal Information", fields: ['name', 'birthday', 'gender'] as const, schema: personalInfoSchema },
  { id: 2, title: "Physical Metrics", fields: ['height', 'weight'] as const, schema: physicalMetricsSchema },
  { id: 3, title: "Medical & Lifestyle", fields: ['existingConditions', 'allergies', 'dailyCalorieGoal'] as const, schema: medicalHistorySchema },
];


const getInitialBirthdayString = (userData: typeof user | null): string | undefined => {
  if (userData?.birthday) {
    const dateObj = typeof userData.birthday === 'string' ? parseISO(userData.birthday) : userData.birthday;
    if (isValid(dateObj)) {
      return format(dateObj, "dd/MM/yyyy");
    }
  }
  return undefined;
};


export function OnboardingFormContent({ onComplete }: { onComplete: () => void }) {
  const { user, updateUserProfile, completeOnboarding } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric'); 
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema), 
    defaultValues: {
      name: user?.name || "",
      gender: user?.gender === "male" || user?.gender === "female" ? user.gender : undefined,
      height: user?.height ?? undefined,
      weight: user?.weight ?? undefined,
      existingConditions: user?.existingConditions?.join(", ") || "",
      allergies: user?.allergies?.join(", ") || "",
      birthday: getInitialBirthdayString(user),
      dailyCalorieGoal: user?.dailyCalorieGoal ?? 2000,
    }, 
    mode: "onChange", 
  });
  
  useEffect(() => {
    if (user) {
      form.reset({ 
        name: user.name || "",
        gender: user.gender === "male" || user.gender === "female" ? user.gender : undefined,
        height: user.height ?? undefined,
        weight: user.weight ?? undefined,
        existingConditions: user.existingConditions?.join(", ") || "",
        allergies: user.allergies?.join(", ") || "",
        birthday: getInitialBirthdayString(user),
        dailyCalorieGoal: user.dailyCalorieGoal ?? 2000,
      }); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); 

  const handleNextStep = async () => {
    const currentStepConfig = STEPS[currentStep - 1];
    const isValidStep = await form.trigger(currentStepConfig.fields);
    
    if (isValidStep) {
      if (currentStep < STEPS.length) {
        setCurrentStep(prev => prev + 1);
      } else {
        await onSubmit(form.getValues());
      }
    } else {
      const firstErrorField = currentStepConfig.fields.find(
        field => form.formState.errors[field as keyof OnboardingFormValues]
      );
      if (firstErrorField) {
        const fieldElement = document.getElementsByName(firstErrorField)[0];
        if (fieldElement) (fieldElement as HTMLElement).focus();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    setIsSaving(true);
    const validatedData = onboardingSchema.safeParse(data);

    if (!validatedData.success) {
      setIsSaving(false);
      console.error("Form validation failed:", validatedData.error.flatten().fieldErrors);
      toast({ title: "Validation Error", description: "Please check the form for errors.", variant: "destructive", iconType: "error" });
      return;
    }

    const { name, gender, height: height_cm, weight: weight_kg, birthday, existingConditions, allergies, dailyCalorieGoal } = validatedData.data;

    let birthdayISO: string | undefined = undefined;
    if (birthday) {
      try {
        const parsedDate = parse(birthday, 'dd/MM/yyyy', new Date());
        if (isValid(parsedDate) && format(parsedDate, 'dd/MM/yyyy') === birthday) {
          birthdayISO = formatISO(parsedDate);
        } else {
          form.setError("birthday", { type: "manual", message: "Invalid date format. Please use DD/MM/YYYY." });
          setIsSaving(false);
          return;
        }
      } catch (error) {
        form.setError("birthday", { type: "manual", message: "Error processing date." });
        setIsSaving(false);
        return;
      }
    }

     let calculatedAge: number | undefined;
     if (birthdayISO) {
       const birthDateObj = parseISO(birthdayISO);
       if (isValid(birthDateObj)) {
         calculatedAge = differenceInYears(new Date(), birthDateObj);
       }
     }

    const profileUpdates: Partial<UserProfileData> & { name: string } = {
      name,
      gender, 
      height: height_cm,
      weight: weight_kg,
      birthday: birthdayISO,
      age: calculatedAge,
      existingConditions: existingConditions ? existingConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      allergies: allergies ? allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      dailyCalorieGoal: dailyCalorieGoal ?? undefined,
    };

    try {
      await updateUserProfile(profileUpdates);
      completeOnboarding(); 
      toast({
        title: "Welcome to AIDoc!",
        description: "Your health profile is all set up. You're ready to explore.",
        variant: "default",
        duration: 4000,
        iconType: "success",
      });
      onComplete(); 
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
        duration: 4000,
        iconType: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <>
      <DialogHeader className="text-center mb-4">
        <CheckCircle className="h-12 w-12 text-primary mx-auto mb-2" />
        <DialogTitle className="text-2xl">Welcome, {form.watch("name") || user?.name || 'User'}!</DialogTitle>
        <DialogDescription>
          Let&apos;s set up your health profile. ({STEPS[currentStep - 1].title})
        </DialogDescription>
        <Progress value={progressPercentage} className="w-full h-2 mt-4" />
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
          {currentStep === 1 && ( 
            <div className="space-y-4 animate-slide-up">
              <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Your full name" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="DD/MM/YYYY"
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={(e) => {
                          let inputValue = e.target.value.replace(/\D/g, ''); 
                          if (inputValue.length > 8) {
                            inputValue = inputValue.slice(0, 8);
                          }
                          let formattedValue = '';
                          if (inputValue.length > 0) {
                            formattedValue = inputValue.slice(0, 2);
                          }
                          if (inputValue.length >= 3) {
                            formattedValue += '/' + inputValue.slice(2, 4);
                          }
                          if (inputValue.length >= 5) {
                            formattedValue += '/' + inputValue.slice(4, 8);
                          }
                          field.onChange(formattedValue);
                        }}
                        maxLength={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField 
                control={form.control} 
                name="gender" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                       <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="grid grid-cols-2 gap-4 pt-1"
                      >
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="male" id="onboarding-gender-male" className="sr-only peer" />
                          </FormControl>
                          <FormLabel 
                            htmlFor="onboarding-gender-male" 
                            className={cn(
                              "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                              "glassmorphic group"
                            )}
                          >
                            <Mars className="mb-3 h-6 w-6 text-blue-500 group-hover:text-primary-foreground" />
                            Male
                          </FormLabel>
                        </FormItem>
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem value="female" id="onboarding-gender-female" className="sr-only peer" />
                          </FormControl>
                          <FormLabel 
                            htmlFor="onboarding-gender-female" 
                            className={cn(
                              "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all",
                              "glassmorphic group"
                            )}
                          >
                            <Venus className="mb-3 h-6 w-6 text-pink-500 group-hover:text-primary-foreground" />
                            Female
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-slide-up">
                <FormItem>
                    <FormLabel>Unit System</FormLabel>
                    <FormControl>
                        <RadioGroup
                            onValueChange={(value: 'metric' | 'imperial') => setUnitSystem(value)}
                            value={unitSystem}
                            className="flex items-center space-x-4"
                        >
                            <FormItem className="flex items-center space-x-1">
                                <FormControl><RadioGroupItem value="metric" id="metric" /></FormControl>
                                <FormLabel htmlFor="metric" className="font-normal cursor-pointer">Metric (cm, kg)</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-1">
                                <FormControl><RadioGroupItem value="imperial" id="imperial" /></FormControl>
                                <FormLabel htmlFor="imperial" className="font-normal cursor-pointer">Imperial (in, lbs)</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                <FormField control={form.control} name="height" render={({ field }) => {
                    let displayHeight = field.value;
                    if (unitSystem === 'imperial' && field.value != null) { 
                        displayHeight = parseFloat((field.value / 2.54).toFixed(1));
                    }
                    return (
                    <FormItem>
                      <FormLabel className="flex items-center"><Ruler className="h-4 w-4 mr-2 text-primary"/>Height ({unitSystem === 'metric' ? 'cm' : 'in'})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={unitSystem === 'metric' ? 'e.g., 175' : 'e.g., 69'}
                          value={displayHeight ?? ''}
                           onChange={e => {
                                const rawValue = e.target.value;
                                if (rawValue === '') {
                                    field.onChange(null); 
                                } else {
                                    const numericValue = Number(rawValue);
                                    const valueInCm = unitSystem === 'imperial' ? numericValue * 2.54 : numericValue;
                                    field.onChange(parseFloat(valueInCm.toFixed(1))); 
                                }
                            }}
                        />
                      </FormControl>
                      <FormDescription>Enter your height in {unitSystem === 'metric' ? 'centimeters.' : 'inches.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}}
                />
                <FormField control={form.control} name="weight" render={({ field }) => {
                    let displayWeight = field.value;
                    if (unitSystem === 'imperial' && field.value != null) { 
                        displayWeight = parseFloat((field.value / 0.453592).toFixed(1));
                    }
                    return (
                    <FormItem>
                      <FormLabel className="flex items-center"><Scale className="h-4 w-4 mr-2 text-primary"/>Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder={unitSystem === 'metric' ? 'e.g., 70' : 'e.g., 154'}
                          value={displayWeight ?? ''} 
                          onChange={e => {
                            const rawValue = e.target.value;
                            if (rawValue === '') {
                                field.onChange(null); 
                            } else {
                                const numericValue = Number(rawValue);
                                const valueInKg = unitSystem === 'imperial' ? numericValue * 0.453592 : numericValue;
                                field.onChange(parseFloat(valueInKg.toFixed(1))); 
                            }
                          }}
                        />
                      </FormControl>
                       <FormDescription>Enter your weight in {unitSystem === 'metric' ? 'kilograms.' : 'pounds.'}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}}
                />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 animate-slide-up">
              <FormField control={form.control} name="existingConditions" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing Medical Conditions (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Asthma, Type 2 Diabetes" {...field} value={field.value ?? ""} rows={3} /></FormControl>
                    <FormDescription>Please list any pre-existing conditions, separated by commas.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="allergies" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Penicillin, Peanuts" {...field} value={field.value ?? ""} rows={3} /></FormControl>
                    <FormDescription>Please list any known allergies, separated by commas.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField control={form.control} name="dailyCalorieGoal" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Flame className="h-4 w-4 mr-2 text-primary"/>Daily Calorie Goal (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 2000" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                     <FormDescription>Set your target daily calorie intake.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
          
          <DialogModalFooter className="pt-6 flex justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={handlePreviousStep} disabled={currentStep === 1 || form.formState.isSubmitting || isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button type="button" onClick={handleNextStep} disabled={form.formState.isSubmitting || isSaving} className="bg-primary hover:bg-primary/90">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (currentStep === STEPS.length ? <Save className="mr-2 h-4 w-4" /> : null)}
              {currentStep === STEPS.length ? "Complete Profile" : "Next"}
              {currentStep < STEPS.length && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </DialogModalFooter>
        </form>
      </Form>
    </>
  );
}

export default function OnboardingPage() {
  const { user, loading: authLoading, showOnboardingModal, setShowOnboardingModal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.onboardingComplete) {
        setShowOnboardingModal(false); 
        router.push('/dashboard');
      } else if (!user.onboardingComplete && !showOnboardingModal) {
        setShowOnboardingModal(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router, showOnboardingModal]); 

  if (authLoading || !user || (user.onboardingComplete && !showOnboardingModal) ) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  return (
     <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        {!showOnboardingModal && 
            <div className="w-full max-w-lg p-8 bg-card rounded-xl shadow-2xl glassmorphic">
                <OnboardingFormContent onComplete={() => router.push('/dashboard')} />
            </div>
        }
         {showOnboardingModal && <p className="text-muted-foreground">Loading onboarding experience...</p> }
    </div>
  );
}
