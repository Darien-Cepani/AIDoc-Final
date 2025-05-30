
"use client"

import React, { useState, useCallback, useMemo, ChangeEvent, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, UploadCloud, AlertTriangle, CheckCircle2, Search, ListFilter, FolderOpen, X, Trash2, Eye, Info, ChevronDown, ChevronUp, Palette, SortAsc, SortDesc, CalendarDays, FileType2, Columns, ListChecks, Pill, MessageCircle, ActivitySquare, Droplet, GripVertical, BriefcaseMedical, Microscope, HeartPulse, Brain, FileQuestion, Video, Image as ImageIconLucide, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { summarizeMedicalDocument, type SummarizeMedicalDocumentInput, type SummarizeMedicalDocumentOutput, type KeyMetric } from '@/ai/flows/summarize-medical-document';
import { updateDocumentAnalysisSummary, type UpdateDocumentAnalysisSummaryInput, type NewDocumentAnalysis } from '@/ai/flows/updateDocumentAnalysisSummaryFlow';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter as DialogModalFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogTrigger as DialogTriggerPrimitive } from '@radix-ui/react-dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { db, storage } from '@/lib/firebase';
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, Unsubscribe, setDoc, getDocs } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { format, parseISO, isValid, formatDistanceToNowStrict } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';


const getCategoryIcon = (category?: string | null, fileType?: string | null): React.ElementType => {
    if (fileType?.startsWith("video/")) return Video;
    if (fileType?.startsWith("image/")) return ImageIconLucide;
    if (!category) return FileQuestion;
    const catLower = category.toLowerCase();
    if (catLower.includes("lab result")) return Microscope;
    if (catLower.includes("blood test")) return Droplet;
    if (catLower.includes("consultation")) return MessageCircle;
    if (catLower.includes("prescription")) return Pill;
    if (catLower.includes("imaging")) return Eye;
    if (catLower.includes("hospital") || catLower.includes("discharge")) return BriefcaseMedical;
    if (catLower.includes("immunization")) return ShieldCheck;
    if (catLower.includes("surgical")) return ActivitySquare;
    if (catLower.includes("pathology")) return Brain;
    if (catLower.includes("medical video")) return Video;
    if (catLower.includes("rejected") || catLower.includes("invalid") || catLower.includes("non-medical") || catLower.includes("processing error")) return AlertTriangle;
    return FolderOpen;
};


interface DocumentMetadataForFirestore extends Omit<SummarizeMedicalDocumentOutput, 'validation' | 'keyMetrics'> {
  name: string;
  uploadDate: Timestamp;
  documentDate?: string | null;
  fileType?: string | null;
  fileSize?: number;
  storagePath?: string | null;
  downloadUrl?: string | null;
  isRelevant?: boolean;
  rejectionReason?: string | null;
  keyMetrics?: Array<KeyMetric & { normalRange?: string | null }> | null;
   validation?: {
    isMedicalDocument: boolean;
    rejectionReason?: string | null;
  };
}


interface UploadedDocumentExt extends DocumentMetadataForFirestore {
  id: string;
  uploadDate: Date; 
  isSummarizing?: boolean;
  error?: string;
  thumbnailUrl?: string | null; // Transient, for immediate local preview
}

type GroupingOption = "category" | "documentDate" | "uploadDate" | "relevance";

const colorCodingLegendItems = [
    { color: "bg-green-500/20 border-green-500/50", label: "Relevant & Processed" },
    { color: "bg-amber-500/20 border-amber-500/50", label: "Summarizing / In Progress" },
    { color: "bg-red-500/20 border-red-500/50", label: "Rejected / Error" },
    { color: "bg-primary/20 border-primary/50", label: "Key Metric Tag" },
    { color: "bg-purple-500/20 border-purple-500/50", label: "Condition Tag" },
];

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => Promise<void>;
}

const UploadDocumentModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [modalSelectedFiles, setModalSelectedFiles] = useState<File[]>([]);
    const modalFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleModalFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setModalSelectedFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    const removeModalSelectedFile = (fileName: string) => {
        setModalSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleModalUpload = async () => {
        if (modalSelectedFiles.length === 0) return;
        setIsUploading(true);
        await onUpload(modalSelectedFiles);
        setIsUploading(false);
        setModalSelectedFiles([]);
        if (modalFileInputRef.current) modalFileInputRef.current.value = "";
        onClose();
    };

    useEffect(() => {
        if (!isOpen) {
            setModalSelectedFiles([]);
            if (modalFileInputRef.current) modalFileInputRef.current.value = "";
        }
    }, [isOpen]);

    const SUPPORTED_MIME_TYPES_CLIENT = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'text/plain', 'text/markdown',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'
    ].join(',');


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg glassmorphic">
                <DialogHeader>
                    <DialogTitle className="flex items-center"><UploadCloud className="mr-3 h-6 w-6 text-primary" />Upload New Documents</DialogTitle>
                    <DialogDescription>Batch upload PDFs, images (PNG, JPG, WEBP), videos (MP4, MOV, WEBM, OGG), or text files. AI will summarize and categorize them (ensure all output is in English).</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div
                        className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 bg-background/30 hover:bg-primary/5 transition-colors duration-200"
                        onClick={() => modalFileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if(e.dataTransfer.files) setModalSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                    >
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                        <p className="text-xs text-muted-foreground">PDF, PNG, JPG, WEBP, TXT, MD, MP4, MOV, WEBM, OGG (MAX. 10MB each)</p>
                        <Input id="documentUploadModal" type="file" onChange={handleModalFileChange} ref={modalFileInputRef}
                            accept={SUPPORTED_MIME_TYPES_CLIENT} className="hidden" multiple />
                    </div>
                    {modalSelectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Selected files ({modalSelectedFiles.length}):</Label>
                            <ScrollArea className="h-32 border rounded-md p-2 custom-scrollbar glassmorphic bg-background/20">
                                {modalSelectedFiles.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center justify-between text-xs p-1.5 hover:bg-primary/10 rounded">
                                        <span className="truncate">
                                            {file.type.startsWith("image/") && <ImageIconLucide className="inline h-3.5 w-3.5 mr-1.5"/>}
                                            {file.type.startsWith("video/") && <Video className="inline h-3.5 w-3.5 mr-1.5"/>}
                                            {!file.type.startsWith("image/") && !file.type.startsWith("video/") && <FileText className="inline h-3.5 w-3.5 mr-1.5"/>}
                                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                        </span>
                                        <Button variant="ghost" size="icon" onClick={() => removeModalSelectedFile(file.name)} className="h-5 w-5 p-0"><X className="h-3 w-3"/></Button>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </div>
                <DialogModalFooter>
                    <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
                    <Button onClick={handleModalUpload} disabled={modalSelectedFiles.length === 0 || isUploading} className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                        {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading ({modalSelectedFiles.length || 0})...</>
                        : <><UploadCloud className="mr-2 h-4 w-4" /> Upload ({modalSelectedFiles.length || 0}) Files</>}
                    </Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>
    );
};

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: {
        searchTerm: string;
        filterCategory: string;
        sortBy: 'documentDate' | 'uploadDate' | 'name' | 'category';
        sortOrder: 'asc' | 'desc';
        groupingOption: GroupingOption;
    };
    onApplyFilters: (filters: FilterModalProps['currentFilters']) => void;
    availableCategories: string[];
}

const FilterSortModal: React.FC<FilterModalProps> = ({ isOpen, onClose, currentFilters, onApplyFilters, availableCategories }) => {
    const [tempFilters, setTempFilters] = useState(currentFilters);

    useEffect(() => {
        setTempFilters(currentFilters);
    }, [currentFilters, isOpen]);

    const handleApply = () => {
        onApplyFilters(tempFilters);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md glassmorphic">
                <DialogHeader>
                    <DialogTitle>Filter & Sort Documents</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="modal-search">Search</Label>
                        <Input id="modal-search" placeholder="Search documents..." value={tempFilters.searchTerm} onChange={(e) => setTempFilters(prev => ({ ...prev, searchTerm: e.target.value }))} className="glassmorphic" prependIcon={Search} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="modal-filter-category">Filter by Category</Label>
                        <Select value={tempFilters.filterCategory} onValueChange={(val) => setTempFilters(prev => ({ ...prev, filterCategory: val }))}>
                            <SelectTrigger id="modal-filter-category" className="w-full glassmorphic"><ListFilter className="h-4 w-4 mr-2 opacity-70" /> <SelectValue placeholder="Filter by category" /></SelectTrigger>
                            <SelectContent> {availableCategories.map(category => (<SelectItem key={category} value={category}>{category}</SelectItem>))} </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="modal-sort-by">Sort by</Label>
                         <Select value={tempFilters.sortBy} onValueChange={(val) => setTempFilters(prev => ({ ...prev, sortBy: val as any }))}>
                            <SelectTrigger id="modal-sort-by" className="w-full glassmorphic"><ChevronDown className="h-4 w-4 mr-2 opacity-70" /> <SelectValue placeholder="Sort by" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="documentDate">Document Date</SelectItem>
                                <SelectItem value="uploadDate">Upload Date</SelectItem>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="category">Category</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="modal-sort-order">Sort Order</Label>
                        <Button variant="outline" onClick={() => setTempFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))} className="w-full glassmorphic"> {tempFilters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2"/> : <SortDesc className="h-4 w-4 mr-2"/>} {tempFilters.sortOrder === 'asc' ? 'Ascending' : 'Descending'} </Button>
                    </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="modal-group-by">Group by</Label>
                        <Select value={tempFilters.groupingOption} onValueChange={(val) => setTempFilters(prev => ({ ...prev, groupingOption: val as GroupingOption }))}>
                            <SelectTrigger id="modal-group-by" className="w-full glassmorphic"><Columns className="h-4 w-4 mr-2 opacity-70"/> <SelectValue placeholder="Group by" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="category">Category</SelectItem>
                                <SelectItem value="documentDate">Document Month</SelectItem>
                                <SelectItem value="uploadDate">Upload Month</SelectItem>
                                <SelectItem value="relevance">Relevance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogModalFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleApply} className="bg-primary hover:bg-primary/90">Apply Filters</Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function DocumentsPage() {
  const { user, updateUserProfile } = useAuth();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocumentExt[]>([]);
  const [isFetchingDocs, setIsFetchingDocs] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [docToDelete, setDocToDelete] = useState<UploadedDocumentExt | null>(null);
  const [docToView, setDocToView] = useState<UploadedDocumentExt | null>(null);
  const [activeAccordionItems, setActiveAccordionItems] = useState<string[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);


  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortBy, setSortBy] = useState<'documentDate' | 'uploadDate' | 'name' | 'category'>('documentDate');
  const [groupingOption, setGroupingOption] = useState<GroupingOption>("documentDate");

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [totalFilesToAnalyze, setTotalFilesToAnalyze] = useState(0);
  const [filesAnalyzed, setFilesAnalyzed] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user?.id) {
        setUploadedDocuments([]);
        setIsFetchingDocs(false);
        return;
    }
    setIsFetchingDocs(true);
    const docsCol = collection(db, `users/${user.id}/documentMetadata`);

    const q = query(docsCol, orderBy("documentDate", "desc"), orderBy("uploadDate", "desc"));


    const unsubscribe = onSnapshot(q, (snapshot) => {
        const docsFromDb: UploadedDocumentExt[] = snapshot.docs.map(docSnap => {
            const data = docSnap.data() as DocumentMetadataForFirestore;
            const keyMetricsWithNullableNormalRange = (data.keyMetrics || []).map(km => ({
                ...km,
                normalRange: km.normalRange === undefined ? null : km.normalRange,
            }));

            return {
                ...data,
                id: docSnap.id,
                uploadDate: (data.uploadDate as Timestamp).toDate(),
                documentDate: data.documentDate || null,
                fileType: data.fileType || null,
                storagePath: data.storagePath || null,
                downloadUrl: data.downloadUrl || null,
                keyMetrics: keyMetricsWithNullableNormalRange,
                rejectionReason: data.rejectionReason === undefined ? null : data.rejectionReason,
                validation: data.validation ? {
                    isMedicalDocument: data.validation.isMedicalDocument,
                    rejectionReason: data.validation.rejectionReason === undefined ? null : data.rejectionReason,
                } : undefined,
                isSummarizing: false, 
                error: undefined, 
                thumbnailUrl: null, 
            };
        });
        setUploadedDocuments(docsFromDb);
        setIsFetchingDocs(false);
    }, (error) => {
        console.error("Error fetching documents from Firestore:", error);
        toast({ title: "Error", description: "Could not load documents.", variant: "destructive", iconType: "error" });
        setIsFetchingDocs(false);
    });

    return () => unsubscribe();
  }, [user?.id, toast]);


  const processAndUploadFile = useCallback(async (file: File): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        if (!user || !user.id) {
            toast({ title: "User not authenticated", description: "Please log in to upload documents.", variant: "destructive", iconType: "error" });
            return reject(new Error("User not authenticated"));
        }
        const fileType = file.type;
        const localDocId = `local-${file.name}-${Date.now()}`;

        let tempThumbnailUrl: string | undefined = undefined;
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) { 
            tempThumbnailUrl = URL.createObjectURL(file);
        }


        const tempUiDoc: UploadedDocumentExt = {
            id: localDocId, name: file.name, isSummarizing: true, uploadDate: new Date(),
            overallSummary: "Uploading & Preparing for Analysis...", fileSize: file.size, fileType: fileType,
            thumbnailUrl: tempThumbnailUrl, 
            suggestedCategory: "Processing...",
            keyMetrics: [], identifiedConditions: [], mentionedMedications: [], documentDate: null,
            isRelevant: undefined, 
        };
        setUploadedDocuments(prev => [tempUiDoc, ...prev.filter(d => d.id !== localDocId)]);

        try {
          const filePath = `users/${user.id}/documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const fileRef = storageRef(storage, filePath);
          const uploadTask = uploadBytesResumable(fileRef, file);

          await uploadTask;
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          setUploadedDocuments(prev => prev.map(doc => doc.id === localDocId ? {...doc, isSummarizing: true, overallSummary: "Summarizing document..." } : doc));

          const inputToAiFlow: SummarizeMedicalDocumentInput = {
            documentInfo: {
              downloadUrl: downloadURL,
              originalFileName: file.name,
              mimeType: file.type,
            }
          };
          const summaryResult = await summarizeMedicalDocument(inputToAiFlow);

          const isRelevantDoc = summaryResult.validation?.isMedicalDocument ?? false;
          if (isRelevantDoc) setAcceptedCount(prev => prev + 1); else setRejectedCount(prev => prev + 1);

          const keyMetricsWithNullableNormalRange = (summaryResult.keyMetrics || []).map(km => ({
              ...km,
              normalRange: km.normalRange === undefined ? null : km.normalRange,
          }));

          const docToSave: Omit<DocumentMetadataForFirestore, 'uploadDate'> & { uploadDate: Timestamp } = {
            name: file.name,
            uploadDate: Timestamp.fromDate(new Date()),
            documentDate: summaryResult.documentDate || null,
            fileType: file.type || null,
            fileSize: file.size || undefined,
            storagePath: filePath,
            downloadUrl: downloadURL,
            suggestedCategory: summaryResult.suggestedCategory || null,
            overallSummary: summaryResult.overallSummary,
            keyMetrics: keyMetricsWithNullableNormalRange,
            identifiedConditions: summaryResult.identifiedConditions || [],
            mentionedMedications: summaryResult.mentionedMedications || [],
            isRelevant: isRelevantDoc,
            rejectionReason: !isRelevantDoc ? (summaryResult.validation?.rejectionReason || "AI determined not relevant or could not validate.") : null,
            validation: summaryResult.validation ? {
                isMedicalDocument: summaryResult.validation.isMedicalDocument,
                rejectionReason: summaryResult.validation.rejectionReason === undefined ? null : summaryResult.rejectionReason,
            } : undefined,
          };

          await addDoc(collection(db, `users/${user!.id}/documentMetadata`), docToSave);
          setUploadedDocuments(prev => prev.filter(d => d.id !== localDocId)); 

          if (isRelevantDoc && updateUserProfile && user) {
            const newDocAnalysisInput: NewDocumentAnalysis = {
              documentName: docToSave.name,
              uploadDate: new Date(docToSave.uploadDate.seconds * 1000).toISOString(),
              documentDate: docToSave.documentDate || null, 
              suggestedCategory: docToSave.suggestedCategory || undefined,
              documentAISummary: docToSave.overallSummary,
              identifiedConditionsInDoc: docToSave.identifiedConditions || [],
              keyMetricsExtracted: (docToSave.keyMetrics || []).map(km => ({
                name: km.name, value: km.value, unit: km.unit || undefined,
                normalRange: km.normalRange, 
                date: km.date || null,
              })),
            };
            const previousDocSummary = user.consolidatedDocumentAnalysisSummary || "";
            const userProfileContextForSummary = { age: user.age, gender: user.gender, existingConditions: user.existingConditions };

            try {
              const updatedSummaryResult = await updateDocumentAnalysisSummary({
                previousDocSummary, newDocumentAnalysis: newDocAnalysisInput, userProfileContext: userProfileContextForSummary
              });
              await updateUserProfile({
                consolidatedDocumentAnalysisSummary: updatedSummaryResult.updatedDocumentAnalysisSummary,
                consolidatedDocumentAnalysisSummaryLastUpdated: new Date().toISOString(),
              });
            } catch (summaryError) {
              console.error("Error updating consolidated document summary:", summaryError);
              toast({ title: "Summary Update Failed", description: "Could not update the overall document summary.", variant: "destructive", iconType: "warning" });
            }
          }

          const categoryKey = !isRelevantDoc ? "Rejected/Invalid Documents" : (summaryResult.suggestedCategory || "Uncategorized");
          if (!activeAccordionItems.includes(categoryKey)) {
            setActiveAccordionItems(prev => [...prev, categoryKey]);
          }
          resolve();

        } catch (error: any) {
          console.error("Error processing or uploading file:", error);
          setRejectedCount(prev => prev + 1);
          const errorMessageForToast = (error.validation?.rejectionReason) || error.message || "Failed to process document.";
          toast({ title: "Document Processing Error", description: `Could not process ${file.name}: ${errorMessageForToast}`, variant: "destructive", iconType: "error" });
          
          setUploadedDocuments(prev => prev.map(doc => {
            if (doc.id === localDocId) {
              return {
                ...doc, 
                error: errorMessageForToast, 
                isSummarizing: false, 
                overallSummary: "Error in processing.",
                isRelevant: false, 
                validation: { 
                  isMedicalDocument: false, 
                  rejectionReason: errorMessageForToast 
                }
              };
            }
            return doc;
          }));

           if (!activeAccordionItems.includes("Rejected/Invalid Documents")) {
            setActiveAccordionItems(prev => [...prev, "Rejected/Invalid Documents"]);
          }
          reject(error);
        } finally {
            setFilesAnalyzed(prev => prev + 1);
            if (tempThumbnailUrl && tempThumbnailUrl.startsWith('blob:')) {
                URL.revokeObjectURL(tempThumbnailUrl);
            }
        }
    });
  }, [user, updateUserProfile, activeAccordionItems, toast]); 


  const handleBatchUpload = async (files: File[]) => {
    if (files.length === 0 || !user?.id) return;
    setIsAnalyzing(true);
    setTotalFilesToAnalyze(files.length);
    setFilesAnalyzed(0);
    setAcceptedCount(0);
    setRejectedCount(0);
    setAnalysisProgress(0);

    const toastId = toast({
        title: "Starting Document Analysis...",
        description: `Preparing to analyze ${files.length} documents.`,
        iconType: "info",
    }).id;

    for (let i = 0; i < files.length; i++) {
        try {
            await processAndUploadFile(files[i]);
        } catch (e: any) {
            console.error(`Failed to process file ${files[i].name}`, e);
        }
        const currentProgress = ((i + 1) / files.length) * 100;
        setAnalysisProgress(currentProgress);
        toast({
            id: toastId,
            title: "Analyzing Documents...",
            description: `Processed ${i + 1} of ${files.length}. (${currentProgress.toFixed(0)}%)`,
            iconType: "info",
            duration: files.length > 5 && i < files.length -1 ? 100000 : 3000, 
        });
    }

    toast({
        id: toastId,
        title: "Batch Analysis Complete!",
        description: `${acceptedCount} documents accepted, ${rejectedCount} rejected.`,
        iconType: acceptedCount > 0 && rejectedCount === 0 ? "success" : (rejectedCount > 0 ? "warning" : "info"),
        duration: 5000,
    });
    setIsAnalyzing(false);
  };

  const confirmDeleteDocument = async () => {
    if (!docToDelete || !user?.id) return;
    try {
      await deleteDoc(doc(db, `users/${user.id}/documentMetadata`, docToDelete.id));

      if (docToDelete.storagePath) {
        const fileRef = storageRef(storage, docToDelete.storagePath);
        await deleteObject(fileRef).catch(storageError => {
          console.warn(`Failed to delete file from Storage: ${docToDelete.storagePath}`, storageError);
        });
      }

      if (docToDelete.isRelevant && updateUserProfile && user) {
         const remainingDocs = uploadedDocuments.filter(d => d.id !== docToDelete.id && d.isRelevant);
         let newConsolidatedSummary = "";
         if (remainingDocs.length > 0) {
            newConsolidatedSummary = "Document deleted. Consolidated summary will be updated upon next relevant document processing or overall summary refresh.";
         } else {
            newConsolidatedSummary = "No documents available for summary."; 
         }

         await updateUserProfile({
             consolidatedDocumentAnalysisSummary: newConsolidatedSummary || null,
             consolidatedDocumentAnalysisSummaryLastUpdated: newConsolidatedSummary ? new Date().toISOString() : null
         });
         toast({ title: "Document Deleted", description: `"${docToDelete.name}" removed. Consolidated document summary may need regeneration.`, iconType: "success", duration: 7000 });
      } else {
         toast({ title: "Document Deleted", description: `"${docToDelete.name}" has been removed.`, iconType: "success" });
      }
      setDocToDelete(null);
    } catch (error) {
      console.error("Error deleting document from Firestore:", error);
      toast({ title: "Error", description: "Could not delete document.", variant: "destructive", iconType: "error" });
    }
  };

  useEffect(() => {
    if (groupingOption === 'category' || groupingOption === 'relevance') {
      const allCategories = Array.from(new Set(uploadedDocuments.map(d => {
        if (groupingOption === 'category') return !d.isRelevant ? "Rejected/Invalid Documents" : (d.suggestedCategory || "Uncategorized");
        return d.isRelevant ? "Relevant Documents" : "Rejected/Invalid Documents";
      })));
      setActiveAccordionItems(allCategories);
    } else if (groupingOption === 'documentDate' || groupingOption === 'uploadDate') {
        const allMonths = Array.from(new Set(uploadedDocuments.map(d => {
            const dateToUse = (groupingOption === 'documentDate' && d.documentDate && isValid(parseISO(d.documentDate)))
                                ? parseISO(d.documentDate)
                                : d.uploadDate; 
            return format(dateToUse, 'MMMM yyyy');
        }
        )));
        setActiveAccordionItems(allMonths);
    }
  }, [uploadedDocuments, groupingOption]);


  const filteredAndSortedDocuments = useMemo(() => {
    let docs = uploadedDocuments.filter(doc => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = doc.name.toLowerCase().includes(lowerSearchTerm) ||
                            (doc.overallSummary && doc.overallSummary.toLowerCase().includes(lowerSearchTerm)) ||
                            (doc.validation?.rejectionReason && doc.validation.rejectionReason.toLowerCase().includes(lowerSearchTerm)) ||
                            (doc.keyMetrics?.some(m => m.name.toLowerCase().includes(lowerSearchTerm) || String(m.value).toLowerCase().includes(lowerSearchTerm))) ||
                            (doc.identifiedConditions?.some(c => c.toLowerCase().includes(lowerSearchTerm)));

      const currentCategory = !doc.isRelevant ? "Rejected/Invalid Documents" : (doc.suggestedCategory || "Uncategorized");
      const matchesCategory = filterCategory === 'all' || currentCategory === filterCategory;

      return matchesSearch && matchesCategory;
    });

    docs.sort((a, b) => {
        let comparison = 0;
        const dateA = (sortBy === 'documentDate' && a.documentDate && isValid(parseISO(a.documentDate))) ? parseISO(a.documentDate) : a.uploadDate;
        const dateB = (sortBy === 'documentDate' && b.documentDate && isValid(parseISO(b.documentDate))) ? parseISO(b.documentDate) : b.uploadDate;

        if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
        else if (sortBy === 'uploadDate') comparison = b.uploadDate.getTime() - a.uploadDate.getTime(); 
        else if (sortBy === 'documentDate') comparison = dateB.getTime() - dateA.getTime();
        else if (sortBy === 'category') {
          const catA = !a.isRelevant ? "ZZZ_Rejected" : (a.suggestedCategory || "ZZ_Uncategorized"); 
          const catB = !b.isRelevant ? "ZZZ_Rejected" : (b.suggestedCategory || "ZZ_Uncategorized");
          comparison = catA.localeCompare(catB);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });
    return docs;
  }, [uploadedDocuments, searchTerm, filterCategory, sortBy, sortOrder]);


  const groupedDocuments = useMemo(() => {
    const groups: Record<string, UploadedDocumentExt[]> = {};
    filteredAndSortedDocuments.forEach(doc => {
      let groupKey = "";
      if (groupingOption === "category") {
        groupKey = !doc.isRelevant ? "Rejected/Invalid Documents" : (doc.suggestedCategory || 'Uncategorized');
      } else if (groupingOption === "documentDate" || groupingOption === "uploadDate") {
         const dateToUse = (groupingOption === 'documentDate' && doc.documentDate && isValid(parseISO(doc.documentDate)))
                            ? parseISO(doc.documentDate)
                            : doc.uploadDate; 
        groupKey = format(dateToUse, 'MMMM yyyy');
      } else if (groupingOption === "relevance") {
        groupKey = doc.isRelevant ? "Relevant Documents" : "Rejected/Invalid Documents";
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(doc);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
        if (groupingOption === "category") {
            if (a === "Rejected/Invalid Documents") return 1; if (b === "Rejected/Invalid Documents") return -1;
            if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1;
        }
        if (groupingOption === "documentDate" || groupingOption === "uploadDate") {
            const datePartsA = a.split(" ");
            const datePartsB = b.split(" ");
            const dateA = new Date(Date.parse(datePartsA[0] +" 1, " + datePartsA[1]));
            const dateB = new Date(Date.parse(datePartsB[0] +" 1, " + datePartsB[1]));
            if (isValid(dateA) && isValid(dateB)) return dateB.getTime() - dateA.getTime();
        }
        return a.localeCompare(b); 
    });

    const sortedGroups: Record<string, UploadedDocumentExt[]> = {};
    sortedGroupKeys.forEach(key => sortedGroups[key] = groups[key]);
    return sortedGroups;
  }, [filteredAndSortedDocuments, groupingOption]);

  const documentCategoriesForFilter = useMemo(() => {
    const categories = new Set(uploadedDocuments
        .map(doc => !doc.isRelevant ? "Rejected/Invalid Documents" : (doc.suggestedCategory || "Uncategorized")));
    return ['all', ...Array.from(categories).sort((a,b) => {
        if (a === "Rejected/Invalid Documents") return 1; if (b === "Rejected/Invalid Documents") return -1;
        if (a === "Uncategorized") return 1; if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
    })];
  }, [uploadedDocuments]);

  const getDocumentCardColor = (doc: UploadedDocumentExt): string => {
    if (doc.isSummarizing) return "bg-amber-500/10 border-amber-500/30 animate-pulse";
    if (!doc.isRelevant || doc.error) return "bg-destructive/10 border-destructive/30";
    return "bg-green-500/10 border-green-500/30";
  };

 const IconDisplay = ({ icon: IconComp, ...props }: { icon?: React.ElementType, [key: string]: any }) => {
    if (!IconComp) return <FileQuestion {...props} />; 
    return <IconComp {...props} />;
  };

  const getMetricColorClass = (metric: KeyMetric): string => {
      if (!metric || !metric.normalRange || !metric.value) return ""; 
      const value = parseFloat(String(metric.value).replace(/[^0-9.-]/g, '')); 
      if (isNaN(value)) return ""; 

      const range = String(metric.normalRange).replace(/\s/g, ''); 

      if (range.includes('-')) {
          const [minStr, maxStr] = range.split('-');
          const min = parseFloat(minStr.replace(/[^0-9.-]/g, ''));
          const max = parseFloat(maxStr.replace(/[^0-9.-]/g, ''));
          if (!isNaN(min) && !isNaN(max)) {
              if (value >= min && value <= max) return "bg-green-500/10"; 
              return "bg-amber-500/10"; 
          }
      }
      else if (range.startsWith('<')) {
          const max = parseFloat(range.substring(range.startsWith('<=') ? 2 : 1).replace(/[^0-9.-]/g, ''));
          if (!isNaN(max)) {
              if (range.startsWith('<=')) { 
                  if (value <= max) return "bg-green-500/10"; 
              } else { 
                  if (value < max) return "bg-green-500/10"; 
              }
              return "bg-amber-500/10"; 
          }
      }
      else if (range.startsWith('>')) {
          const min = parseFloat(range.substring(range.startsWith('>=') ? 2 : 1).replace(/[^0-9.-]/g, ''));
          if (!isNaN(min)) {
              if (range.startsWith('>=')) { 
                  if (value >= min) return "bg-green-500/10"; 
              } else { 
                  if (value > min) return "bg-green-500/10"; 
              }
              return "bg-amber-500/10"; 
          }
      }
      return ""; 
  };

  const getDisplayDate = (doc: UploadedDocumentExt): string => {
    if (doc.documentDate && isValid(parseISO(doc.documentDate))) {
        return format(parseISO(doc.documentDate), 'MMM d, yyyy');
    }
    return format(doc.uploadDate, 'MMM d, yyyy'); 
  };

  const renderPdfPreview = (downloadUrl: string, docName: string) => {
      if (!downloadUrl) return <p className="text-sm text-muted-foreground p-4 text-center">Document URL not available.</p>;
      const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
      return (
          <iframe src={googleDocsViewerUrl} width="100%" height="100%" title={docName} className="border-none">
              <p className="p-4 text-sm text-muted-foreground">
                  PDF preview not available. Download: <a href={downloadUrl} download={docName} className="text-primary hover:underline">{docName}</a>
              </p>
          </iframe>
      );
  };

  const currentFilterSettings = { searchTerm, filterCategory, sortBy, sortOrder, groupingOption };
  const handleApplyFiltersFromModal = (newFilters: typeof currentFilterSettings) => {
      setSearchTerm(newFilters.searchTerm);
      setFilterCategory(newFilters.filterCategory);
      setSortBy(newFilters.sortBy);
      setSortOrder(newFilters.sortOrder);
      setGroupingOption(newFilters.groupingOption);
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
         <Button onClick={() => setIsUploadModalOpen(true)} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:shadow-lg">
             <UploadCloud className="mr-2 h-5 w-5" /> Upload Documents
         </Button>

         {(!isFetchingDocs && uploadedDocuments.length > 0) && (
            isMobile ? (
                <div className="flex w-full sm:w-auto justify-between items-center gap-2">
                    <Input 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="flex-grow glassmorphic min-w-[100px]" 
                        prependIcon={Search} 
                    />
                    <Button variant="outline" onClick={() => setIsFilterModalOpen(true)} className="glassmorphic p-2.5">
                        <SlidersHorizontal className="h-5 w-5" />
                    </Button>
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2 justify-end flex-grow">
                    <Input placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs sm:max-w-sm md:max-w-md glassmorphic" prependIcon={Search} />
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full sm:w-[180px] glassmorphic"><ListFilter className="h-4 w-4 mr-2 opacity-70" /> <SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent> {documentCategoriesForFilter.map(category => ( <SelectItem key={category} value={category}>{category}</SelectItem> ))} </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val as any)}>
                        <SelectTrigger className="w-full sm:w-[160px] glassmorphic"><ChevronDown className="h-4 w-4 mr-2 opacity-70" /> <SelectValue placeholder="Sort by" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="documentDate">Doc Date</SelectItem>
                            <SelectItem value="uploadDate">Upload Date</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="category">Category</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="w-[40px] sm:w-auto p-2 sm:p-2.5 glassmorphic"> {sortOrder === 'asc' ? <SortAsc className="h-4 w-4"/> : <SortDesc className="h-4 w-4"/>} </Button>
                    <Select value={groupingOption} onValueChange={(val) => setGroupingOption(val as GroupingOption)}>
                        <SelectTrigger className="w-full sm:w-[160px] glassmorphic"><Columns className="h-4 w-4 mr-2 opacity-70"/> <SelectValue placeholder="Group by" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="documentDate">Doc Month</SelectItem>
                            <SelectItem value="uploadDate">Upload Month</SelectItem>
                            <SelectItem value="relevance">Relevance</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )
         )}
        <Button variant="ghost" size="icon" onClick={() => setShowLegend(!showLegend)} title="Toggle Color Legend" className={cn("text-muted-foreground hover:text-primary", (uploadedDocuments.length === 0 && !isFetchingDocs) && "hidden")}>
            <Info className={cn("h-5 w-5", showLegend ? "text-primary" : "")} />
        </Button>
      </div>
      
      {isAnalyzing && (
          <Card className="glassmorphic p-4 my-4">
              <CardTitle className="text-md mb-2">Analysis Progress</CardTitle>
              <Progress value={analysisProgress} className="w-full h-3 mb-1" />
              <p className="text-xs text-muted-foreground text-center">
                  Analyzed {filesAnalyzed} of {totalFilesToAnalyze} documents.
                  ({acceptedCount} accepted, {rejectedCount} rejected)
              </p>
          </Card>
      )}

      <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleBatchUpload}
      />
      {isMobile && (
        <FilterSortModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            currentFilters={currentFilterSettings}
            onApplyFilters={handleApplyFiltersFromModal}
            availableCategories={documentCategoriesForFilter}
        />
      )}


      {isFetchingDocs && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading documents...</p>
        </div>
      )}

      {!isFetchingDocs && uploadedDocuments.length > 0 && (
        <Card className="glassmorphic">
          <CardHeader className="pt-4 pb-2">
            <CardTitle className="flex items-center"><FolderOpen className="mr-3 h-6 w-6 text-primary" />Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4">
            <ScrollArea className="h-[calc(100vh-20rem)] md:h-[calc(100vh-22rem)] pr-1 custom-scrollbar">
              {Object.entries(groupedDocuments).length > 0 ? (
                <Accordion type="multiple" className="w-full space-y-3" value={activeAccordionItems} onValueChange={setActiveAccordionItems}>
                  {Object.entries(groupedDocuments).map(([groupKey, docs]) => (
                    <AccordionItem value={groupKey} key={groupKey} className="border-none">
                      <AccordionTrigger className={`px-4 py-3 hover:bg-muted/15 rounded-lg text-md font-semibold glassmorphic shadow-md hover:shadow-lg transition-all ${groupKey.includes("Rejected") || groupKey.includes("Error") ? "bg-destructive/10 hover:bg-destructive/20" : "bg-card/50 hover:bg-card/70"}`}>
                        <div className="flex items-center gap-3">
                            {groupingOption === "category" && <IconDisplay icon={getCategoryIcon(groupKey, docs[0]?.fileType)} className="h-6 w-6 text-primary" />}
                            {(groupingOption === "documentDate" || groupingOption === "uploadDate") && <CalendarDays className="h-6 w-6 text-primary" />}
                            {groupingOption === "relevance" && (docs[0]?.isRelevant ? <CheckCircle2 className="h-6 w-6 text-green-500"/> : <AlertTriangle className="h-6 w-6 text-destructive"/>) }
                            {groupKey} <Badge variant="secondary" className="ml-2">{docs.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 space-y-3 pl-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {docs.map((doc) => (
                          <Card key={doc.id} className={cn(`rounded-lg shadow-md hover:shadow-xl transition-all duration-200 animate-fade-in-fast glassmorphic flex flex-col`, getDocumentCardColor(doc))}>
                            <CardHeader className="p-3">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center min-w-0 gap-2">
                                        {doc.thumbnailUrl && doc.thumbnailUrl.startsWith('blob:') ? ( 
                                            <Image src={doc.thumbnailUrl} alt={doc.name} width={40} height={40} className="h-10 w-10 object-cover rounded-sm border border-border/50" data-ai-hint="document thumbnail"/>
                                        ) : (doc.downloadUrl && doc.fileType?.startsWith('image/')) ? ( 
                                            <Image src={doc.downloadUrl} alt={doc.name} width={40} height={40} className="h-10 w-10 object-cover rounded-sm border border-border/50" data-ai-hint="document image thumbnail"/>
                                        ) : ( 
                                            <IconDisplay icon={getCategoryIcon(doc.suggestedCategory, doc.fileType) || FileType2} className="h-8 w-8 text-primary/70 flex-shrink-0" />
                                        )}
                                        <span className="font-semibold text-sm truncate" title={doc.name}>{doc.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 shrink-0">
                                        {doc.isSummarizing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {!doc.isSummarizing && !doc.error && doc.isRelevant && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                        {!doc.isSummarizing && (doc.error || !doc.isRelevant) && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {getDisplayDate(doc)}
                                  {doc.uploadDate && <span className="text-muted-foreground/70"> (Uploaded: {formatDistanceToNowStrict(doc.uploadDate, { addSuffix: true })})</span>}
                                  {(doc.fileSize && doc.fileSize > 0) ? ` (${(doc.fileSize / 1024).toFixed(1)} KB)` : ""}
                                </p>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 flex-grow">
                                {(doc.overallSummary || doc.validation?.rejectionReason) && !doc.isSummarizing && (
                                <div className={`mt-1 p-2 rounded-md text-xs ${!doc.isRelevant ? 'bg-destructive/10' : 'bg-background/20'}`}>
                                    <h5 className="font-semibold text-xs mb-0.5">{!doc.isRelevant ? 'Rejection Reason' : 'Summary Preview'}:</h5>
                                    <p className="text-muted-foreground whitespace-pre-wrap line-clamp-2 hover:line-clamp-none transition-all duration-150">
                                    {doc.validation?.rejectionReason || doc.overallSummary}
                                    </p>
                                </div>
                                )}
                                {doc.isRelevant && (doc.keyMetrics?.length || doc.identifiedConditions?.length) && !doc.isSummarizing && (
                                <div className="mt-2 space-x-1 space-y-1">
                                    {doc.keyMetrics?.slice(0,2).map(m => <Badge key={m.name + (m.date || '')} variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary/90">{m.name}: {String(m.value)}{m.unit||''}</Badge>)}
                                    {doc.identifiedConditions?.slice(0,2).map(c => <Badge key={c} variant="secondary" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300">{c}</Badge>)}
                                </div>
                                )}
                                {doc.error && !doc.isSummarizing && ( <Alert variant="destructive" className="mt-2 text-xs p-2"><AlertTriangle className="h-3 w-3" /> <AlertDescription>{doc.error}</AlertDescription></Alert> )}
                            </CardContent>
                            <CardFooter className="p-2 border-t border-border/30 flex justify-end gap-1.5">
                                <Button variant="ghost" size="sm" onClick={() => setDocToView(doc)} className="text-xs h-7"><Eye className="mr-1 h-3.5 w-3.5" /> View</Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setDocToDelete(doc)} className="text-xs h-7 w-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"> <Trash2 className="h-3.5 w-3.5" /> </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="glassmorphic"> <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle> <AlertDialogDescription>Are you sure you want to delete "{docToDelete?.name}"? This action cannot be undone.</AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setDocToDelete(null)}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteDocument} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                          </Card>
                        ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : ( <div className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center"> <Search className="mx-auto h-12 w-12 mb-2 text-primary/50" /> <p>No documents match your current filters.</p> </div> )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
       {!isFetchingDocs && uploadedDocuments.length === 0 && !isAnalyzing && (
        <div className="text-center text-muted-foreground py-12 flex flex-col items-center justify-center animate-fade-in">
          <FileText className="mx-auto h-16 w-16 mb-4 text-primary/50" />
          <p className="text-xl">No documents uploaded yet.</p>
          <p className="text-sm mt-1">Upload your medical documents to get started.</p>
        </div>
      )}

      {docToView && (
        <Dialog open={!!docToView} onOpenChange={(isOpen) => !isOpen && setDocToView(null)} >
            <DialogContent className="sm:max-w-5xl glassmorphic shadow-2xl max-h-[95vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl">{docToView.name}</DialogTitle>
                    <DialogDescription>
                        Full summary and extracted details.
                        {docToView.suggestedCategory && `Category: ${docToView.suggestedCategory}. `}
                        {docToView.documentDate && isValid(parseISO(docToView.documentDate)) && `Document Date: ${format(parseISO(docToView.documentDate), 'PPP')}. `}
                        Uploaded: {format(docToView.uploadDate, 'PPP p')}.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow flex flex-col lg:flex-row gap-6 py-2 min-h-0">
                    <div className="lg:w-2/5 flex-shrink-0 h-full max-h-[80vh] flex flex-col">
                        <h4 className="font-semibold text-md mb-2 shrink-0">Original Document/Media</h4>
                        <div className="rounded-md border shadow-md overflow-hidden bg-muted/20 flex-grow flex items-center justify-center">
                            {(docToView.downloadUrl) ? (
                                docToView.fileType?.startsWith('image/') ? (
                                    <DialogTriggerPrimitive asChild>
                                        <Image src={docToView.downloadUrl} alt={docToView.name} layout="intrinsic" width={800} height={1200} className="max-w-full max-h-full object-contain cursor-pointer" data-ai-hint="medical document image"/>
                                    </DialogTriggerPrimitive>
                                ) : docToView.fileType === 'application/pdf' ? (
                                    renderPdfPreview(docToView.downloadUrl, docToView.name)
                                ) : docToView.fileType?.startsWith('video/') ? (
                                    <video controls src={docToView.downloadUrl} className="max-w-full max-h-full h-auto" data-ai-hint="medical video">
                                        Your browser does not support the video tag. Download: <a href={docToView.downloadUrl} download={docToView.name} className="text-primary hover:underline">{docToView.name}</a>
                                    </video>
                                ) : ( 
                                    <p className="text-sm text-muted-foreground p-4 text-center">
                                        Preview not available for this file type. Download: <a href={docToView.downloadUrl} download={docToView.name} className="text-primary hover:underline">{docToView.name}</a>
                                    </p>
                                )
                            ) : <p className="text-sm text-muted-foreground p-4 text-center">Original file not available for preview.</p>}
                        </div>
                    </div>

                    <div className="lg:w-3/5 flex-grow min-h-0">
                        <ScrollArea className="h-full pr-3 custom-scrollbar">
                             <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-md mb-1">Overall Summary (in English)</h4>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{docToView.validation?.rejectionReason || docToView.overallSummary}</p>
                                </div>

                                {docToView.isRelevant && docToView.keyMetrics && docToView.keyMetrics.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-md mb-1">Key Metrics (in English)</h4>
                                        <div className="border rounded-md overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Metric</TableHead>
                                                        <TableHead>Normal Range</TableHead>
                                                        <TableHead>Actual Value</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {docToView.keyMetrics.map((metric, index) => {
                                                        const metricDate = metric.date && isValid(parseISO(metric.date)) 
                                                                         ? parseISO(metric.date) 
                                                                         : (docToView.documentDate && isValid(parseISO(docToView.documentDate)) ? parseISO(docToView.documentDate) : null);
                                                        const formattedDateString = metricDate 
                                                                         ? `(${format(metricDate, 'MMM d, yyyy')})` 
                                                                         : '';
                                                        return (
                                                            <TableRow
                                                                key={`${metric.name}-${metric.date || ''}-${index}`}
                                                                className={getMetricColorClass(metric)}
                                                            >
                                                                <TableCell className="font-medium">{metric.name}</TableCell>
                                                                <TableCell>{metric.normalRange || 'N/A'}</TableCell>
                                                                <TableCell>{metric.value} {metric.unit || ''} {formattedDateString}</TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {docToView.isRelevant && docToView.identifiedConditions && docToView.identifiedConditions.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-md mb-1">Identified Conditions (in English)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {docToView.identifiedConditions.map(c => (
                                                <Badge key={c} variant="secondary" className="bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300">{c}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {docToView.isRelevant && docToView.mentionedMedications && docToView.mentionedMedications.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-md mb-1">Mentioned Medications (in English)</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {docToView.mentionedMedications.map(m => (
                                                <Badge key={m} variant="outline" className="border-primary/30 bg-primary/10 text-primary/90">{m}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {(docToView.downloadUrl && docToView.fileType?.startsWith('image/')) && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="w-fit text-xs mt-2"> <Eye className="mr-1 h-3.5 w-3.5"/> View Full Image </Button>
                                        </DialogTrigger>
                                         <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl glassmorphic shadow-2xl max-h-[95vh] flex flex-col p-2">
                                            <DialogHeader className="p-2"> <DialogTitle className="text-lg">Full Image: {docToView.name}</DialogTitle> </DialogHeader>
                                             <ScrollArea className="flex-grow flex justify-center items-center p-0 custom-scrollbar">
                                                <img src={docToView.downloadUrl} alt={`Full image of ${docToView.name}`} className="max-w-full h-auto object-contain mx-auto my-auto"/>
                                             </ScrollArea>
                                              <DialogModalFooter className="p-2 border-t mt-auto"> <Button onClick={() => {}} variant="outline">Close</Button> </DialogModalFooter> 
                                         </DialogContent>
                                    </Dialog>
                                )}
                             </div>
                        </ScrollArea>
                       </div>
                    </div>
                <DialogModalFooter className="mt-auto"> <Button onClick={() => setDocToView(null)} variant="outline">Close</Button> </DialogModalFooter>
            </DialogContent>
        </Dialog>
      )}

      <div className={cn( "fixed bottom-[calc(3.5rem+0.5rem)] right-2 z-50 p-4 rounded-lg shadow-xl glassmorphic w-auto max-w-xs transition-all duration-500 ease-in-out md:bottom-2", showLegend ? "animate-fly-in-bottom-right opacity-100" : "animate-fly-out-bottom-right opacity-0 pointer-events-none" )}>
        <div className="flex justify-between items-center mb-2"> <h4 className="text-sm font-semibold text-foreground">Color Legend</h4> <Button variant="ghost" size="icon" onClick={() => setShowLegend(false)} className="h-6 w-6 p-0"><X className="h-4 w-4"/></Button> </div>
        <ul className="space-y-1.5"> {colorCodingLegendItems.map(item => ( <li key={item.label} className="flex items-center text-xs"> <span className={cn("h-3 w-3 rounded-sm mr-2 border", item.color)}></span> <span className="text-muted-foreground">{item.label}</span> </li> ))} </ul>
      </div>
    </div>
  );
}
