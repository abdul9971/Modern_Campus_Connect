'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { initializeApp, deleteApp } from 'firebase/app';
import type { User } from 'firebase/auth';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useStorage, useUser } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, ImageUp, X, Loader2, UploadCloud } from 'lucide-react';
import { Progress } from './ui/progress';

type AddUserFormProps = {
  role: 'teacher' | 'student';
};

// --- Zod Schemas for Validation ---
const personalDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  dateOfBirth: z.string().min(1, 'Date of Birth is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
});

const studentPersonalDetailsSchema = personalDetailsSchema.extend({
    class: z.string().min(1, 'Class is required'),
});

const credentialsSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});


// --- Child Components for UI ---

function StepIndicator({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) {
    return (
        <div className="flex justify-center items-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, index) => {
                const step = index + 1;
                const isActive = step === currentStep;
                const isCompleted = step < currentStep;
                return (
                    <div key={step} className="flex items-center gap-2">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                isCompleted && "bg-primary/50 text-primary-foreground"
                            )}
                        >
                            {step}
                        </div>
                        {step < totalSteps && <div className="w-12 h-0.5 bg-muted" />}
                    </div>
                );
            })}
        </div>
    );
}

const ImageUploadControl = ({
  previewUrl,
  onFileChange,
  onRemoveImage,
  errorMessage,
  isUploading,
  uploadProgress,
}: {
  previewUrl: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  errorMessage: string | null;
  isUploading: boolean;
  uploadProgress: number | null;
}) => (
  <FormItem className="md:col-span-2">
    <FormLabel>Profile Photo</FormLabel>
    <div className="flex items-center gap-4">
        <div className={cn(
            "relative h-24 w-24 rounded-lg border-2 border-dashed border-input flex items-center justify-center text-muted-foreground overflow-hidden",
            errorMessage && "border-destructive"
        )}>
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover rounded-md" />
              {isUploading && uploadProgress !== null && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white font-medium">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs mt-1">{Math.round(uploadProgress)}%</span>
                </div>
              )}
            </>
          ) : (
            <ImageUp className="h-8 w-8" />
          )}
          {previewUrl && !isUploading && (
             <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={onRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
          )}
        </div>
        <div className="flex-grow">
            <Input id="photo-upload" type="file" accept="image/png, image/jpeg" onChange={onFileChange} className="hidden" disabled={!!previewUrl || isUploading} />
            <Button type="button" variant="outline" asChild className={cn(!!previewUrl && "hidden")}>
                <label htmlFor="photo-upload" className="cursor-pointer">
                   <UploadCloud className="mr-2 h-4 w-4"/> Upload Photo
                </label>
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Passport photo only • Max size: 100KB</p>

            {errorMessage && (
                <p className="text-sm font-medium text-destructive mt-2">{errorMessage}</p>
            )}
        </div>
      </div>
  </FormItem>
);

// --- Main Form Component ---

export function AddUserForm({ role }: AddUserFormProps) {
  const [step, setStep] = useState(1);
  const [personalData, setPersonalData] = useState<any>(null);
  
  // Staged Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [tempPhoto, setTempPhoto] = useState<{ path: string; url: string } | null>(null);
  
  // Final Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user: adminUser } = useUser();
  const router = useRouter();

  const currentPersonalDetailsSchema = role === 'student' ? studentPersonalDetailsSchema : personalDetailsSchema;

  const personalDetailsForm = useForm({
    resolver: zodResolver(currentPersonalDetailsSchema),
    mode: 'onChange',
    defaultValues: { name: '', dateOfBirth: '', phoneNumber: '', address: '', class: role === 'student' ? '' : undefined, },
  });

  const credentialsForm = useForm({
    resolver: zodResolver(credentialsSchema),
    mode: 'onChange',
    defaultValues: { username: '', email: '', password: '' },
  });

  // --- Step 1 Logic: Temp Image Upload ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous state first, in case of re-selection
    handleRemoveImage();
    
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setImageError('Invalid file type. Please use JPG or PNG.');
      return;
    }
    if (file.size > 100 * 1024) { // 100KB limit
      setImageError('Image size exceeds 100KB. Please upload a smaller photo.');
      return;
    }

    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    if (!storage || !adminUser) {
        toast({ variant: "destructive", title: "Upload Failed", description: "Storage or admin user not available." });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const tempPath = `temp-profile-images/${adminUser.uid}/${uuidv4()}.jpg`;
    const tempPhotoRef = storageRef(storage, tempPath);
    const uploadTask = uploadBytesResumable(tempPhotoRef, file);

    uploadTask.on(
        'state_changed',
        (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
        (error) => {
            setIsUploading(false);
            setUploadProgress(null);
            setImageError('Photo upload failed. Please try again.');
            console.error("Temp upload failed:", error);
        },
        async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            setTempPhoto({ path: tempPath, url: url });
            setIsUploading(false);
            toast({ title: "Photo Ready", description: "You can proceed to the next step." });
        }
    );
  };
  
  const handleRemoveImage = async () => {
    setImageError(null);
    setPhotoFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setIsUploading(false);
    setUploadProgress(null);

    const input = document.getElementById('photo-upload') as HTMLInputElement;
    if (input) input.value = '';

    if (tempPhoto && storage) {
      const tempRef = storageRef(storage, tempPhoto.path);
      await deleteObject(tempRef).catch(e => console.warn("Could not delete temp photo:", e));
      setTempPhoto(null);
    }
  };

  const handlePersonalDetailsSubmit = (data: any) => {
    if (isUploading) {
        toast({ variant: 'destructive', title: 'Please Wait', description: 'Photo is still uploading.' });
        return;
    }
    if (photoFile && !tempPhoto) {
        toast({ variant: 'destructive', title: 'Upload Incomplete', description: 'Please wait for the photo to finish uploading, or re-select the photo.' });
        return;
    }

    setPersonalData({ ...data, tempPhoto });
    setStep(2);
  };

  // --- Step 2 Logic: Atomic User Creation ---

  const handleCredentialsSubmit = async (credentials: any) => {
    if (!personalData || !firestore || !storage) {
      toast({ variant: 'destructive', title: 'Error', description: 'System not ready.' });
      return;
    }
    
    setIsSubmitting(true);
    toast({ title: 'Creating Account...', description: 'Please wait.' });
    
    // Using a temporary app instance ensures auth state doesn't conflict with the admin's session.
    const tempApp = initializeApp(firebaseConfig, `temp-user-creation-${uuidv4()}`);
    const tempAuth = getAuth(tempApp);

    let createdUser: User | null = null;

    try {
      // 1. Create Auth user
      const userCredential = await createUserWithEmailAndPassword(tempAuth, credentials.email, credentials.password);
      createdUser = userCredential.user;

      // 2. Create Firestore document (with photo info initially empty)
      const collectionName = role === 'teacher' ? 'teachers' : 'students';
      const userDocRef = doc(firestore, collectionName, createdUser.uid);
      const initialUserData = {
        ...personalData,
        username: credentials.username,
        email: credentials.email,
        id: createdUser.uid,
        disabled: false,
        createdAt: serverTimestamp(),
        photoURL: '',
        photoPath: '',
      };
      // We don't want the `tempPhoto` object in our final Firestore document.
      delete initialUserData.tempPhoto; 
      
      await setDoc(userDocRef, initialUserData);

      let finalPhotoURL = '';
      let finalPhotoPath = '';

      // 3. If a temp photo exists, "move" it to its final destination
      // The simplest way to "move" is to re-upload from the source file.
      // A server-side function would be more robust but client-side is fine for this scale.
      if (personalData.tempPhoto && photoFile) {
        finalPhotoPath = `profile-images/${role}s/${createdUser.uid}.jpg`;
        const finalPhotoRef = storageRef(storage, finalPhotoPath);
        
        const finalUploadTask = uploadBytesResumable(finalPhotoRef, photoFile);
        await finalUploadTask;
        finalPhotoURL = await getDownloadURL(finalUploadTask.snapshot.ref);

        // 4. Update Firestore doc with final photo info
        await updateDoc(userDocRef, {
            photoURL: finalPhotoURL,
            photoPath: finalPhotoPath,
        });

        // 5. Clean up temp file from storage
        const tempFileRef = storageRef(storage, personalData.tempPhoto.path);
        await deleteObject(tempFileRef);
      }

      toast({
        title: role === 'teacher' ? 'Teacher ID Created' : 'Account Created Successfully!',
        description: `The account for ${personalData.name} has been created.`,
      });

      router.push(role === 'teacher' ? '/admin/teacher-dashboard' : '/admin/student-dashboard');
      
    } catch (error: any) {
      console.error("User creation failed:", error);
      let description = 'An unknown error occurred during account creation.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already in use by another account.';
      }
      toast({ variant: 'destructive', title: 'Creation Failed', description, duration: 8000 });
      
      // --- ATOMIC ROLLBACK ---
      if (createdUser) {
        // This requires the user to be recently signed in, which they are in the tempApp.
        await createdUser.delete().catch(e => console.error("Orphaned Auth user cleanup failed:", e));
      }
      // If the user was never created but the temp photo exists, it remains.
      // It can be cleaned up later or ignored as it's not referenced anywhere.
    } finally {
      // Clean up the temporary Firebase app instance
      await signOut(tempAuth).catch(() => {});
      await deleteApp(tempApp).catch(() => {});
      setIsSubmitting(false);
    }
  };


  return (
    <div className="pt-4">
      <StepIndicator currentStep={step} totalSteps={2} />
      {step === 1 && (
        <FormProvider {...personalDetailsForm}>
          <form onSubmit={personalDetailsForm.handleSubmit(handlePersonalDetailsSubmit)} className="space-y-6">
            <h3 className="font-semibold text-lg text-center">Step 1: Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField name="name" render={({ field }) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                {role === 'student' && (
                    <FormField name="class" render={({ field }) => (
                        <FormItem><FormLabel>Class</FormLabel><FormControl><Input {...field} placeholder="e.g. SYIT" /></FormControl><FormMessage /></FormItem>
                    )}/>
                )}
                 <FormField name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="address" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <ImageUploadControl
                    previewUrl={previewUrl}
                    onFileChange={handleFileChange}
                    onRemoveImage={handleRemoveImage}
                    errorMessage={imageError}
                    isUploading={isUploading}
                    uploadProgress={uploadProgress}
                />
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isUploading}>
                    Next: Create Credentials <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
          </form>
        </FormProvider>
      )}

      {step === 2 && (
        <FormProvider {...credentialsForm}>
          <form onSubmit={credentialsForm.handleSubmit(handleCredentialsSubmit)} className="space-y-6">
            <h3 className="font-semibold text-lg text-center">Step 2: Account Credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="password" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <div className="flex justify-between gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...</> : `Create ${role === 'teacher' ? 'Teacher' : 'Student'} Account`}
                </Button>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
}
