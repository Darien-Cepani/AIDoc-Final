
"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Loader2, User, Stethoscope, FileText as MedicalChartIcon, MessageSquare, Brain, BookOpen, HelpCircle, ListChecks, AlertTriangle, PlusCircle, Paperclip, X, Send, Image as ImageIconLucide, ExternalLink, History, Trash2, PanelRightClose, PanelLeftOpen, Download, Video, FileText } from "lucide-react";
import { aiPoweredDiagnosis, type AiPoweredDiagnosisInput, type AiPoweredDiagnosisOutput, type PotentialCondition } from '@/ai/flows/ai-powered-diagnosis';
import { updateChatSummary, type UpdateChatSummaryInput, type NewChatConclusion } from '@/ai/flows/updateChatSummaryFlow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth, type User as AuthUserType } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, Timestamp, Unsubscribe, setDoc, getDocs, writeBatch, updateDoc, limit } from 'firebase/firestore';
import { formatDistanceToNowStrict } from 'date-fns';
import { FullMedicalChart } from '@/components/medical-chart/FullMedicalChart';
import { useToast } from '@/hooks/use-toast';


interface Message {
  id: string;
  role: 'user' | 'model' | 'systemInfo';
  content: string;
  aiResponse?: AiPoweredDiagnosisOutput | null;
  timestamp: Date;
  attachmentName?: string | null;
  attachmentPreviewUrl?: string | null;
  attachmentType?: string | null;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[]; 
  lastUpdated: Date; 
  currentSymptoms: string[];
  currentConditions: string[];
  currentDoctorTypes: string[];
  potentialConditionsContext: PotentialCondition[];
  userProfileSnapshot?: string | null; 
}

interface MedicalChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AuthUserType | null;
}

const MedicalChartModal: React.FC<MedicalChartModalProps> = ({ isOpen, onClose, user }) => {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl glassmorphic h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Full Medical Chart</DialogTitle>
                    <DialogDescription>Comprehensive overview of your health information.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow p-1 pr-3 custom-scrollbar">
                    <FullMedicalChart user={user} />
                </ScrollArea>
                <DialogModalFooter className="mt-auto">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={() => toast({ title: "Coming Soon!", description: "PDF Download feature for the medical chart is under development.", iconType: "info"})}><Download className="mr-2 h-4 w-4"/>Download Chart</Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function ChatPage() {
  const { user, updateUserProfile } = useAuth(); 
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);
  const [isChatHubOpen, setIsChatHubOpen] = useState(true);
  const [isMedicalChartModalOpen, setIsMedicalChartModalOpen] = useState(false);


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const currentChatSession = useMemo(() => {
    return chatSessions.find(session => session.id === currentSessionId);
  }, [chatSessions, currentSessionId]);


  const generateUserProfileContextForAI = useCallback((): string => {
    if (!user) return "User profile not available.";
    let context = `Current User Profile:\nAge: ${user.age || 'N/A'}\nGender: ${user.gender || 'N/A'}.`;
    if (user.existingConditions && user.existingConditions.length > 0) {
      context += `\nKnown conditions: ${user.existingConditions.join(', ')}.`;
    }
    if (user.allergies && user.allergies.length > 0) {
      context += `\nAllergies: ${user.allergies.join(', ')}.`;
    }
    
    if (user.consolidatedDocumentAnalysisSummary) {
        context += `\n\nKey insights from user's medical documents (summarized):\n${user.consolidatedDocumentAnalysisSummary}`;
    }
    if (user.consolidatedChatSummary) {
        context += `\n\nSummary of previous relevant AI health chat conclusions:\n${user.consolidatedChatSummary}`;
    }
    return context.trim();
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setChatSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
      return;
    }

    const sessionsCol = collection(db, `users/${user.id}/chatSessions`);
    const q = query(sessionsCol, orderBy("lastUpdated", "desc"));

    const unsubscribeSessions = onSnapshot(q, (snapshot) => {
      const fetchedSessions: ChatSession[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: data.title || "Untitled Chat",
          lastUpdated: (data.lastUpdated as Timestamp)?.toDate() || new Date(),
          messages: [], // Messages are loaded separately
          currentSymptoms: data.currentSymptoms || [],
          currentConditions: data.currentConditions || [],
          currentDoctorTypes: data.currentDoctorTypes || [],
          potentialConditionsContext: data.potentialConditionsContext || [],
          userProfileSnapshot: data.userProfileSnapshot || null,
        };
      });
      setChatSessions(fetchedSessions);
      if (fetchedSessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(fetchedSessions[0].id);
      } else if (fetchedSessions.length === 0) {
        startNewChat(); // Auto-start a new chat if none exist
      }
    }, (error) => {
      console.error("Error fetching chat sessions:", error);
      toast({ title: "Error Loading Chats", description: "Could not load chat history.", variant: "destructive", iconType: "error" });
    });

    return () => unsubscribeSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Removed startNewChat to prevent potential loops

   useEffect(() => {
    if (chatSessions.length === 0 && user?.id && !isLoading && !currentSessionId) { // Ensure not already in a session
      startNewChat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSessions, user?.id, isLoading, currentSessionId]);


  useEffect(() => {
    if (!currentSessionId || !user?.id) {
      setMessages([]);
      return;
    }

    const messagesCol = collection(db, `users/${user.id}/chatSessions/${currentSessionId}/messages`);
    const qMessages = query(messagesCol, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (snapshot) => {
      const fetchedMessages: Message[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          role: data.role,
          content: data.content,
          aiResponse: data.aiResponse === undefined ? null : data.aiResponse,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
          attachmentName: data.attachmentName === undefined ? null : data.attachmentName,
          attachmentPreviewUrl: data.attachmentPreviewUrl === undefined ? null : data.attachmentPreviewUrl,
          attachmentType: data.attachmentType === undefined ? null : data.attachmentType,
        };
      });
      setMessages(fetchedMessages);
    }, (error) => {
      console.error(`Error fetching messages for session ${currentSessionId}:`, error);
      toast({ title: "Error Loading Messages", description: `Could not load messages for the current chat.`, variant: "destructive", iconType: "error" });
    });

    return () => unsubscribeMessages();
  }, [currentSessionId, user?.id]);


  const startNewChat = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const newSessionId = `chat-${Date.now()}-${Math.random().toString(36).substring(2,7)}`;
    const profileContextForAI = generateUserProfileContextForAI(); // Generate fresh context
    const newSessionData: Omit<ChatSession, 'id' | 'messages'> & { lastUpdated: Timestamp } = {
      title: `New Chat - ${new Date().toLocaleTimeString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      lastUpdated: serverTimestamp() as Timestamp,
      currentSymptoms: [],
      currentConditions: user?.existingConditions || [],
      currentDoctorTypes: [],
      potentialConditionsContext: [],
      userProfileSnapshot: profileContextForAI,
    };

    try {
      const newSessionRef = doc(db, `users/${user.id}/chatSessions`, newSessionId);
      await setDoc(newSessionRef, newSessionData);
      setCurrentSessionId(newSessionId); // This will trigger the useEffect for messages
      setUserQuery('');
      setSelectedFile(null);
      setFilePreview(null);
      setFileType(null);
      if (isHistoryModalOpen) setIsHistoryModalOpen(false);
    } catch (error) {
      console.error("Error starting new chat in Firestore:", error);
      toast({ title: "Error Starting Chat", description: "Could not start a new chat session.", variant: "destructive", iconType: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.existingConditions, generateUserProfileContextForAI, isHistoryModalOpen]);


  const addMessageToCurrentChat = async (messageData: Omit<Message, 'id' | 'timestamp'>, updatedContext?: Partial<Pick<ChatSession, 'currentSymptoms' | 'currentConditions' | 'currentDoctorTypes' | 'potentialConditionsContext' | 'title'>>) => {
    if (!currentSessionId || !user?.id || !user || !updateUserProfile) return;

    const messageRef = doc(collection(db, `users/${user.id}/chatSessions/${currentSessionId}/messages`));
    const finalMessageData = {
      ...messageData,
      timestamp: serverTimestamp(),
      aiResponse: messageData.aiResponse === undefined ? null : messageData.aiResponse,
      attachmentName: messageData.attachmentName === undefined ? null : messageData.attachmentName,
      attachmentPreviewUrl: messageData.attachmentPreviewUrl === undefined ? null : messageData.attachmentPreviewUrl,
      attachmentType: messageData.attachmentType === undefined ? null : messageData.attachmentType,
    };

    try {
      await setDoc(messageRef, finalMessageData);

      const sessionDocRef = doc(db, `users/${user.id}/chatSessions/${currentSessionId}`);
      const sessionUpdateData: Partial<ChatSession & {lastUpdated: Timestamp}> = {
        lastUpdated: serverTimestamp() as Timestamp,
      };

      if (updatedContext) {
        const currentSessionForUpdate = chatSessions.find(s => s.id === currentSessionId);
        if(currentSessionForUpdate) {
             // Only update title if it's early in the chat (e.g. first AI response for this session)
            if (updatedContext.title && messages.filter(m => m.role === 'model').length < 1) {
                 sessionUpdateData.title = updatedContext.title;
            }
            if (updatedContext.currentSymptoms) {
                sessionUpdateData.currentSymptoms = [...new Set([...(currentSessionForUpdate.currentSymptoms || []), ...updatedContext.currentSymptoms])];
            }
            if (updatedContext.currentConditions) {
                sessionUpdateData.currentConditions = [...new Set([...(currentSessionForUpdate.currentConditions || []), ...updatedContext.currentConditions])];
            }
            if (updatedContext.currentDoctorTypes) {
                sessionUpdateData.currentDoctorTypes = [...new Set([...(currentSessionForUpdate.currentDoctorTypes || []), ...updatedContext.currentDoctorTypes])].filter(Boolean);
            }
            if (updatedContext.potentialConditionsContext) {
                sessionUpdateData.potentialConditionsContext = updatedContext.potentialConditionsContext;
            }
        }
      }
      await updateDoc(sessionDocRef, sessionUpdateData);

      if (messageData.role === 'model' && messageData.aiResponse) {
        const aiResult = messageData.aiResponse;
        const significantConditions = (aiResult.potentialConditions || []).filter(pc => pc.certainty >= 85);

        if (significantConditions.length > 0 || (aiResult.extractedSymptoms && aiResult.extractedSymptoms.length > 0)) {
          const newChatConclusionInput: NewChatConclusion = {
            chatDate: new Date().toISOString(),
            aiIdentifiedPotentialConditions: significantConditions.map(pc => ({condition: pc.condition, certainty: pc.certainty})),
            keySymptomsDiscussed: aiResult.extractedSymptoms || [],
            chatTitle: aiResult.chatTitleSuggestion || currentChatSession?.title || "Chat Conclusion",
          };

          const previousChatSummary = user.consolidatedChatSummary || "";
          const userProfileContextForSummary = {
            age: user.age,
            gender: user.gender,
            existingConditions: user.existingConditions,
          };

          try {
            const updatedSummaryResult = await updateChatSummary({
              previousChatSummary,
              newChatConclusion: newChatConclusionInput,
              userProfileContext: userProfileContextForSummary,
            });
            await updateUserProfile({
              consolidatedChatSummary: updatedSummaryResult.updatedChatSummary,
              consolidatedChatSummaryLastUpdated: new Date().toISOString(),
            });
          } catch (summaryError) {
            console.error("Error updating consolidated chat summary:", summaryError);
            toast({ title: "Summary Error", description: "Could not update the consolidated chat summary.", variant: "destructive", iconType: "warning" });
          }
        }
      }

    } catch (error) {
      console.error("Error adding message to Firestore:", error);
      toast({ title: "Message Error", description: "Could not save your message.", variant: "destructive", iconType: "error" });
    }
  };


  const confirmDeleteSession = async () => {
    if (!sessionToDelete || !user?.id) return;
    const sessionIdToDelete = sessionToDelete.id;

    try {
      // Delete all messages in the subcollection first
      const messagesCol = collection(db, `users/${user.id}/chatSessions/${sessionIdToDelete}/messages`);
      const messagesQuery = query(messagesCol, limit(500)); // Process in batches of 500
      let messagesSnapshot = await getDocs(messagesQuery);
      while (messagesSnapshot.size > 0) {
          const batch = writeBatch(db);
          messagesSnapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
          if (messagesSnapshot.size < 500) break; // Exit if less than batch size processed
          messagesSnapshot = await getDocs(messagesQuery); // Fetch next batch for very long chats
      }

      // Then delete the session document itself
      await deleteDoc(doc(db, `users/${user.id}/chatSessions/${sessionIdToDelete}`));
      toast({ title: "Chat Deleted", description: `Session "${sessionToDelete.title}" has been deleted.`, iconType: "success" });

      // If the deleted session was the current one, switch to the most recent other session or start new
      if (currentSessionId === sessionIdToDelete) {
        const remainingSessions = chatSessions.filter(s => s.id !== sessionIdToDelete);
        if (remainingSessions.length > 0) {
          // Sort by lastUpdated descending to pick the newest
          setCurrentSessionId(remainingSessions.sort((a,b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())[0].id);
        } else {
          startNewChat();
        }
      }
      setSessionToDelete(null); // Close the confirmation dialog
    } catch (error) {
      console.error(`Error deleting session ${sessionIdToDelete}:`, error);
      toast({ title: "Deletion Error", description: "Could not delete the chat session.", variant: "destructive", iconType: "error" });
    }
  };


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Supported MIME types updated to include common video formats
      const allowedTypes = [
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "text/plain", "text/markdown",
        "video/mp4", "video/webm", "video/quicktime", "video/ogg" // Added video types
      ];
      if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ title: "Invalid File", description: "Unsupported file type or size too large (max 10MB). Videos should ideally be smaller.", variant: "destructive", iconType: "error" });
        return;
      }
      setSelectedFile(file);
      setFileType(file.type);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => { setFilePreview(reader.result as string); };
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        setFilePreview("/pdf-icon.svg"); // Generic PDF icon preview
      } else if (file.type.startsWith("video/")) {
        setFilePreview(null); // No direct preview for video, just show name
      } else {
        setFilePreview(null); // Other types, show name
      }
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null); setFilePreview(null); setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleSubmit = async (e?: React.FormEvent, queryOverride?: string) => {
    if (e) e.preventDefault();
    const queryToSubmit = queryOverride || userQuery;
    if ((!queryToSubmit.trim() && !selectedFile) || !currentSessionId || !currentChatSession || !user?.id) return;
    setIsLoading(true);

    let fileDataUri: string | undefined = undefined;
    let fileName: string | undefined = undefined;
    let currentAttachmentType: string | undefined = undefined;

    if (selectedFile) {
      fileName = selectedFile.name;
      currentAttachmentType = selectedFile.type;
      try {
        fileDataUri = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => {
            console.error("FileReader error:", error);
            reject(new Error("Failed to read file."));
          };
          reader.readAsDataURL(selectedFile!); // reader.readAsDataURL(selectedFile) if selectedFile is guaranteed
        });
      } catch (fileReadError: any) {
        console.error("Error reading file for data URI:", fileReadError);
        toast({ title: "File Read Error", description: fileReadError.message || "Could not process the attached file.", variant: "destructive", iconType: "error" });
        setIsLoading(false);
        return;
      }
    }

    await addMessageToCurrentChat({
      role: 'user', content: queryToSubmit,
      attachmentName: fileName,
      attachmentPreviewUrl: currentAttachmentType?.startsWith("image/") ? fileDataUri : null, // Only store image previews
      attachmentType: currentAttachmentType,
    });
    setUserQuery(''); clearAttachment();

    try {
      const conversationHistoryForAI = messages
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .slice(-10) // Get last 10 messages for history
        .map(msg => ({ role: msg.role, content: msg.content }));

      const input: AiPoweredDiagnosisInput = {
        userProfileContext: currentChatSession.userProfileSnapshot, // Use snapshot for consistency within session
        userQuery: queryToSubmit, conversationHistory: conversationHistoryForAI,
        attachedDocumentDataUri: fileDataUri, attachedDocumentName: fileName,
      };
      const result = await aiPoweredDiagnosis(input);

      const allSuggestedDoctors = new Set<string>();
      if (result.potentialConditions) {
          result.potentialConditions.forEach(pc => {
              if (pc.suggestedDoctorTypesForCondition) {
                  pc.suggestedDoctorTypesForCondition.forEach(doc => allSuggestedDoctors.add(doc.trim()));
              }
          });
      }

      await addMessageToCurrentChat({
        role: 'model', content: result.diagnosisResponse,
        aiResponse: result,
      }, {
        currentSymptoms: result.extractedSymptoms,
        currentConditions: result.extractedConditions,
        currentDoctorTypes: Array.from(allSuggestedDoctors).filter(Boolean),
        potentialConditionsContext: result.potentialConditions,
        title: result.chatTitleSuggestion,
      });

    } catch (error: any) {
      console.error("Error getting AI diagnosis:", error);
      const errorMessage = error.message || (error.diagnosisResponse ? error.diagnosisResponse : "Sorry, I couldn't process your request. Please try again.");
      await addMessageToCurrentChat({
        role: 'systemInfo',
        content: errorMessage,
      });
      toast({ title: "AI Error", description: errorMessage, variant: "destructive", iconType: "error" });
    } finally {
      setIsLoading(false); textareaRef.current?.focus();
    }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      const singleLineHeight = parseFloat(getComputedStyle(textareaRef.current).lineHeight) || 24; 
      const maxHeight = 10 * singleLineHeight; // Max height for 10 lines

      let newHeight = Math.max(singleLineHeight, scrollHeight); 
      newHeight = Math.min(newHeight, maxHeight); 

      textareaRef.current.style.height = `${newHeight}px`;
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [userQuery]);

  const fileTypeIsImage = (fileType?: string | null) => fileType?.startsWith("image/");
  const fileTypeIsVideo = (fileType?: string | null) => fileType?.startsWith("video/");


  const getCertaintyColorClasses = (certainty?: number): string => {
    if (certainty === undefined) return 'bg-muted/30 border-muted-foreground/20 text-muted-foreground';
    if (certainty >= 85) return 'bg-green-500/30 border-green-500/50 text-green-700 dark:text-green-300';
    if (certainty >= 70) return 'bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400';
    if (certainty >= 50) return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-700 dark:text-yellow-300';
    if (certainty >= 25) return 'bg-orange-500/20 border-orange-500/40 text-orange-700 dark:text-orange-300';
    return 'bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300';
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.role === 'systemInfo') return <p className="text-destructive italic">{msg.content}</p>;
    if (msg.role === 'user') {
      return (
        <div>
          <p className="whitespace-pre-wrap">{msg.content}</p>
          {msg.attachmentName && (
            <div className="mt-2 p-1.5 bg-primary/10 rounded-md ">
              {msg.attachmentPreviewUrl && fileTypeIsImage(msg.attachmentType) ? (
                  <Image src={msg.attachmentPreviewUrl} alt={msg.attachmentName} width={128} height={128} className="max-h-32 w-auto rounded object-contain" data-ai-hint="medical image" />
              ) : fileTypeIsVideo(msg.attachmentType) ? (
                <div className="text-xs flex items-center"> <Video className="h-3 w-3 mr-1.5 flex-shrink-0 text-primary" /> {msg.attachmentName} </div>
              ) : (
                <div className="text-xs flex items-center"> <FileText className="h-3 w-3 mr-1.5 flex-shrink-0" /> {msg.attachmentName} </div>
              )}
            </div>
          )}
        </div>
      );
    }
    if (msg.aiResponse) {
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap">{msg.aiResponse.diagnosisResponse}</p>
          {msg.aiResponse.interpretedDocumentSummary && (
            <div className="mt-2 p-2 bg-primary/5 rounded-md glassmorphic border-primary/20">
                <h4 className="font-semibold text-sm mb-1 flex items-center"><FileText className="h-4 w-4 mr-2 text-primary"/>Document Insights:</h4>
                <p className="text-sm whitespace-pre-wrap">{msg.aiResponse.interpretedDocumentSummary}</p>
            </div>
          )}
          {msg.aiResponse.suggestedQuestions && msg.aiResponse.suggestedQuestions.length > 0 && (
            <div className="mt-2 p-2 bg-primary/5 rounded-md glassmorphic border-primary/20">
              <h4 className="font-semibold text-sm mb-1 flex items-center"><HelpCircle className="h-4 w-4 mr-2 text-primary"/>To help me understand better:</h4>
              <ul className="space-y-1">
                {msg.aiResponse.suggestedQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-foreground/90">
                    • {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {msg.aiResponse.sources && msg.aiResponse.sources.length > 0 && (
            <div className="mt-2 p-2 bg-secondary/30 rounded-md glassmorphic border-secondary/50">
              <h4 className="font-semibold text-sm mb-1 flex items-center"><BookOpen className="h-4 w-4 mr-2"/>Sources:</h4>
              <ul className="list-disc list-inside space-y-1">
                {msg.aiResponse.sources.map((source, i) => (
                  <li key={i} className="text-sm">
                    <Link href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"> {source.title} <ExternalLink className="inline h-3 w-3 ml-1 opacity-70"/> </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return <p className="whitespace-pre-wrap">{msg.content}</p>;
  };

  const removeContextItem = async (type: 'symptom' | 'condition' | 'potentialCondition', item: string) => {
    if (!currentSessionId || !user?.id) return;
    const sessionDocRef = doc(db, `users/${user.id}/chatSessions/${currentSessionId}`);
    const sessionData = chatSessions.find(s => s.id === currentSessionId);
    if (!sessionData) return;

    let updatePayload: Partial<ChatSession> = {};
    if (type === 'symptom') updatePayload.currentSymptoms = (sessionData.currentSymptoms || []).filter(s => s !== item);
    if (type === 'condition') updatePayload.currentConditions = (sessionData.currentConditions || []).filter(c => c !== item);
    if (type === 'potentialCondition') {
      const updatedPotentialConditions = (sessionData.potentialConditionsContext || []).filter(pc => pc.condition !== item);
      updatePayload.potentialConditionsContext = updatedPotentialConditions;
      // Also update doctor types if any doctor type was only for this condition
      const remainingDoctorTypes = new Set<string>();
      updatedPotentialConditions.forEach(pc => {
        pc.suggestedDoctorTypesForCondition?.forEach(dt => remainingDoctorTypes.add(dt));
      });
      updatePayload.currentDoctorTypes = Array.from(remainingDoctorTypes);
    }


    try {
        await updateDoc(sessionDocRef, updatePayload);
        toast({title: "Context Updated", description: `${type.charAt(0).toUpperCase() + type.slice(1)} "${item}" removed from current chat context.`, iconType: "info" });
    } catch (error) {
        console.error("Error removing context item from Firestore:", error);
        toast({ title: "Update Error", description: "Could not update chat context.", variant: "destructive", iconType: "error" });
    }
  };

  const handleDownloadChat = () => {
    toast({ title: "Coming Soon!", description: "PDF Download feature for chat summary, context, and medical chart is under development.", iconType: "info" });
  };

  const CHAT_HUB_COLLAPSED_WIDTH = "md:w-12";
  const CHAT_HUB_OPEN_WIDTHS = "w-full md:w-[18rem] lg:w-[20rem] xl:w-[22rem]";

  return (
    <div className="flex h-[calc(100vh-4rem)]"> {/* Adjust height to account for header */}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <ScrollArea className="flex-1 custom-scrollbar pr-2 chat-scrollarea">
          <div className="space-y-4 p-4">
            {messages.length === 0 && !isLoading && currentSessionId && (
              <div className={`flex justify-start animate-slide-up`}>
                <div className={`chat-bubble chat-bubble-ai`}>
                  <p className="whitespace-pre-wrap">Hello! I'm AIDoc, your AI health assistant. How can I help you today? Feel free to ask a health question, describe symptoms, or upload a medical document for interpretation.</p>
                   <p className="text-xs opacity-70 mt-1.5 text-right">{formatDistanceToNowStrict(new Date(), { addSuffix: true })}</p>
                </div>
              </div>
            )}
            {messages.map((msg) => (
                <div key={msg.id} className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                    {renderMessageContent(msg)}
                      <p className="text-xs opacity-70 mt-1.5 text-right">{formatDistanceToNowStrict(msg.timestamp, { addSuffix: true })}</p>
                  </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
            {messages.length === 0 && !isLoading && !currentSessionId && ( // No current session ID implies initial loading state or no chats at all
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center justify-center h-full">
                <MessageSquare className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                <p className="text-lg">Starting new chat or loading history...</p>
              </div>
            )}
             {isLoading && messages.length === 0 && ( // Loading state for when new chat is being created
                <div className="flex justify-center items-center h-full"> <Loader2 className="h-8 w-8 animate-spin text-primary" /> </div>
            )}
          </div>
        </ScrollArea>

        {/* Chat Input Area */}
        <div className="chat-input-outer-wrapper py-3 border-t border-border/30 bg-background/50">
            {selectedFile && (
                <div className="mb-2 ml-2 text-xs p-2 bg-background/80 backdrop-blur-sm rounded-md flex justify-between items-center animate-fade-in-fast shadow-lg w-full max-w-xs">
                    <div className="flex items-center gap-2 truncate">
                        {filePreview && fileTypeIsImage(fileType) ? <Image src={filePreview} alt="preview" width={32} height={32} className="h-8 w-8 object-cover rounded" data-ai-hint="file preview"/>
                        : fileTypeIsVideo(fileType) ? <Video className="h-5 w-5 text-primary"/>
                        : <FileText className="h-5 w-5 text-primary"/>}
                        <span className="truncate">{selectedFile.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearAttachment} className="h-6 w-6 p-0 hover:bg-destructive/20"> <X className="h-3.5 w-3.5" /> </Button>
                </div>
            )}
            <div className="chat-input-container px-4">
                <Card className="chat-input-card">
                    <Textarea
                        ref={textareaRef} id="userQuery"
                        placeholder="Type your health question..."
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        rows={1} 
                        className="chat-input-textarea minimal-scrollbar"
                        title="Press Enter to send, Ctrl+Enter or Shift+Enter for a new line."
                    />
                    <Input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" id="chat-file-upload" accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.mp4,.mov,.webm,.ogg,.webp" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Attach Document/Image/Video" className="h-11 w-11 text-muted-foreground hover:text-primary">
                        {fileTypeIsImage(fileType) ? <ImageIconLucide className="h-5 w-5"/> : fileTypeIsVideo(fileType) ? <Video className="h-5 w-5" /> : <Paperclip className="h-5 w-5"/>}
                    </Button>
                    <Button type="submit" onClick={handleSubmit} disabled={isLoading || (!userQuery.trim() && !selectedFile)} size="icon" title="Send Message" className="h-11 w-11 bg-primary hover:bg-primary/90 rounded-full">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </Card>
            </div>
            <p className="chat-disclaimer-chatpage px-4">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                AI responses are for informational purposes and not a substitute for professional medical advice.
            </p>
        </div>
      </div>

      {/* Chat Hub Sidebar */}
        <Card className={cn(
            "h-full flex flex-col glassmorphic shadow-xl transition-all duration-300 ease-in-out",
            isChatHubOpen ? `${CHAT_HUB_OPEN_WIDTHS} border-l border-border/20` : `${CHAT_HUB_COLLAPSED_WIDTH} p-0 border-l-0 md:border-l`,
            !isChatHubOpen && "overflow-hidden" 
        )}>
          <CardHeader className={cn(
                "pb-3 border-b border-border/30",
                !isChatHubOpen && "p-1.5 flex flex-col items-center justify-center" 
            )}>
            <div className={cn("flex items-center", isChatHubOpen ? "justify-between" : "justify-center")}>
                {isChatHubOpen && <CardTitle className="text-lg">Chat Hub</CardTitle>}
                <Button variant="ghost" size="icon" onClick={() => setIsChatHubOpen(!isChatHubOpen)} className="h-8 w-8" aria-label={isChatHubOpen ? "Close chat hub" : "Open chat hub"}>
                    {isChatHubOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                </Button>
            </div>
             {isChatHubOpen && ( 
                <div className="flex gap-2 mt-2">
                    <Button onClick={startNewChat} size="sm" className="flex-1 glassmorphic bg-primary text-primary-foreground hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Chat
                    </Button>
                    <Button onClick={() => setIsHistoryModalOpen(true)} size="icon" variant="outline" className="w-10 h-10 glassmorphic hover:bg-accent/10" title="Chat History">
                    <History className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleDownloadChat} size="icon" variant="outline" className="w-10 h-10 glassmorphic hover:bg-accent/10" title="Download Chat Summary">
                      <Download className="h-4 w-4" />
                    </Button>
                </div>
            )}
          </CardHeader>

          {isChatHubOpen && currentChatSession && (
            <>
            <ScrollArea className="flex-1 custom-scrollbar">
                <CardContent className="pt-3">
                    <div className="space-y-4">
                        <h3 className="text-md font-semibold mb-1 flex items-center">Current Chat Context</h3>

                            {currentChatSession.userProfileSnapshot && (
                            <div>
                                <Button variant="link" className="p-0 h-auto text-left text-sm font-semibold mb-1 flex items-center text-primary hover:text-primary/80" onClick={() => setIsMedicalChartModalOpen(true)}>
                                    <MedicalChartIcon className="h-4 w-4 mr-2" /> Med Chart
                                </Button>
                                <p className="text-xs text-muted-foreground p-2 bg-background/30 rounded-md whitespace-pre-wrap line-clamp-3 hover:line-clamp-none">
                                    Context: {currentChatSession.userProfileSnapshot}
                                </p>
                            </div>
                            )}

                            {currentChatSession.potentialConditionsContext && currentChatSession.potentialConditionsContext.length > 0 && (
                                <div className="space-y-1.5">
                                <h4 className="text-sm font-semibold mb-1 flex items-center"><Brain className="h-4 w-4 mr-2 text-primary" />Potential Conditions</h4>
                                {currentChatSession.potentialConditionsContext.map((pc, i) => (
                                    <div key={`${pc.condition}-${i}`} className={cn(`p-2 border rounded-md text-xs group removable-badge`, getCertaintyColorClasses(pc.certainty))}>
                                      <div className="flex justify-between items-start">
                                        <Link href={`https://www.google.com/search?q=${encodeURIComponent(pc.condition)}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">
                                            {pc.condition} <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-70"/>
                                        </Link>
                                        <X className="remove-icon h-3.5 w-3.5 ml-2" onClick={() => removeContextItem('potentialCondition', pc.condition)} />
                                      </div>
                                      <span className="text-xs">({pc.certainty}%)</span>
                                      {pc.explanation && <p className="text-xs opacity-80 mt-0.5">{pc.explanation}</p>}
                                      {pc.suggestedDoctorTypesForCondition && pc.suggestedDoctorTypesForCondition.length > 0 && (
                                          <div className="mt-1.5">
                                              <p className="text-xs font-medium text-muted-foreground">Suggested Specialists:</p>
                                              <div className="flex flex-wrap gap-1 mt-0.5">
                                                  {pc.suggestedDoctorTypesForCondition.map(docType => (
                                                      <Badge key={docType} variant="default" className="text-xs cursor-pointer bg-primary/80 hover:bg-primary text-primary-foreground"
                                                          onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(docType + ' specialist')}`, '_blank')}>
                                                          {docType} <ExternalLink className="inline h-3 w-3 ml-1 opacity-80"/>
                                                      </Badge>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                    </div>
                                ))}
                                </div>
                            )}

                            {currentChatSession.currentSymptoms && currentChatSession.currentSymptoms.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-2 text-primary" /> Extracted Symptoms</h4>
                                <div className="flex flex-wrap gap-1.5">
                                {currentChatSession.currentSymptoms.map((symptom, i) =>
                                    <Badge key={`${symptom}-${i}`} variant="secondary" className="group removable-badge text-xs bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/30 dark:text-amber-300">
                                    {symptom} <X className="remove-icon h-3.5 w-3.5" onClick={() => removeContextItem('symptom', symptom)} />
                                    </Badge>
                                )}
                                </div>
                            </div>
                            )}

                            {currentChatSession.currentConditions && currentChatSession.currentConditions.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold mb-1 flex items-center"><ListChecks className="h-4 w-4 mr-2 text-primary" /> Known Conditions</h4>
                                <div className="flex flex-wrap gap-1.5">
                                {currentChatSession.currentConditions.map((condition, i) =>
                                    <Badge key={`${condition}-${i}`} variant="outline" className="group removable-badge text-xs border-blue-500/50 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300">
                                    {condition} <X className="remove-icon h-3.5 w-3.5" onClick={() => removeContextItem('condition', condition)} />
                                    </Badge>
                                )}
                                </div>
                            </div>
                            )}

                            {messages.some(m => m.attachmentName) && (
                            <div>
                                <h4 className="text-sm font-semibold mb-1 flex items-center"><FileText className="h-4 w-4 mr-2 text-primary" /> Chat Documents</h4>
                                <ul className="text-xs text-muted-foreground list-disc list-inside pl-2">
                                    {messages.filter(m => m.attachmentName).map(m => <li key={m.id} className="truncate">{m.attachmentName}</li>)}
                                </ul>
                            </div>
                            )}

                            {
                                !currentChatSession.userProfileSnapshot &&
                                !(currentChatSession.potentialConditionsContext && currentChatSession.potentialConditionsContext.length > 0) &&
                                !(currentChatSession.currentSymptoms && currentChatSession.currentSymptoms.length > 0) &&
                                !(currentChatSession.currentConditions && currentChatSession.currentConditions.length > 0) &&
                                !(messages.some(m => m.attachmentName)) &&
                                <p className="text-xs text-muted-foreground italic text-center py-4">Contextual information will appear here as you chat.</p>
                            }
                    </div>
                </CardContent>
            </ScrollArea>
            <CardFooter className="text-xs text-muted-foreground p-3 border-t border-border/30 mt-auto"> This information is based on the current chat. </CardFooter>
            </>
          )}
          {!isChatHubOpen && <div className="flex-1" /> }
        </Card>

        {/* Chat History Modal */}
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
            <DialogContent className="sm:max-w-lg glassmorphic h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Chat History</DialogTitle>
                    <DialogDescription>Select a previous chat session to continue or review. You can also delete sessions.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow custom-scrollbar pr-2 -mr-2">
                    <div className="space-y-2 py-2">
                        {chatSessions.length === 0 || chatSessions.every(s => s.title.startsWith("New Chat -")) ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No chat history found.</p>
                        ) : (
                            chatSessions.filter(s => !s.title.startsWith("New Chat -") || s.messages.length > 0).map(session => ( // Show new chats if they have messages
                                <div key={session.id} className="group flex items-center justify-between p-0.5 rounded-md hover:bg-accent/10 transition-colors">
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start text-left h-auto py-2 px-3 glassmorphic hover:bg-accent/20 ${session.id === currentSessionId ? 'bg-primary/20 border-primary/50 shadow-sm' : 'border-transparent'}`}
                                        onClick={() => { setCurrentSessionId(session.id); setIsHistoryModalOpen(false); }}
                                    >
                                        <div>
                                            <p className={`font-semibold truncate text-sm ${session.id === currentSessionId ? 'text-primary' : ''}`}>{session.title}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-full">
                                                {`Last updated: ${formatDistanceToNowStrict(session.lastUpdated, { addSuffix: true })}`}
                                            </p>
                                            <p className="text-xs text-muted-foreground/70 mt-0.5">{session.lastUpdated.toLocaleDateString()}</p>
                                        </div>
                                    </Button>
                                     <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-destructive/20 text-destructive transition-opacity" onClick={() => setSessionToDelete(session)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                 <DialogModalFooter className="mt-2">
                    <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Alert Dialog */}
        {sessionToDelete && (
            <AlertDialog open={!!sessionToDelete} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                <AlertDialogContent className="glassmorphic">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Chat Session?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the chat titled &quot;{sessionToDelete.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSessionToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

      <MedicalChartModal
        isOpen={isMedicalChartModalOpen}
        onClose={() => setIsMedicalChartModalOpen(false)}
        user={user}
      />

    </div>
  );
}
