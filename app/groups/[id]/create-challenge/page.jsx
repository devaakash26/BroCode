'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Flag, CheckCircle2, FileEdit, BookOpen, Code, X, Search, Info, Sparkles, LightbulbIcon, BrainCircuit, Rocket } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  title: z.string().min(5, { message: "Challenge title must be at least 5 characters." }),
  description: z.string().optional(),
  startTime: z.string().min(1, { message: "Start time is required." }),
  endTime: z.string().min(1, { message: "End time is required." }),
  isPublic: z.boolean().default(true),
});

export default function CreateChallengePage({ params }) {
  const router = useRouter();
  const groupId = params.id;
  const { data: session, status } = useSession();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [group, setGroup] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [availableProblems, setAvailableProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProblems, setFilteredProblems] = useState([]);
  
  // Setup form with zod validation
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      endTime: "",
      isPublic: true,
    },
  });

  // Fetch group info and check permissions
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        // Fetch group
        const groupResponse = await fetch(`/api/groups/${groupId}`);
        if (!groupResponse.ok) {
          throw new Error('Failed to fetch group');
        }
        const groupData = await groupResponse.json();
        setGroup(groupData);
        
        // If user is not an admin, redirect
        if (groupData.userRole !== 'ADMIN') {
          toast.error('You do not have permission to create challenges for this group');
          router.push(`/groups/${groupId}`);
          return;
        }
        
        // Fetch available problems
        const problemsResponse = await fetch('/api/problems');
        if (!problemsResponse.ok) {
          throw new Error('Failed to fetch problems');
        }
        const problemsData = await problemsResponse.json();
        setAvailableProblems(problemsData.problems || []);
        setFilteredProblems(problemsData.problems || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        setFetchError('Failed to load required data. Please try again later.');
        toast.error('Failed to load required data');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (session) {
      fetchGroup();
    }
  }, [groupId, session, router]);

  // Filter problems based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProblems(availableProblems);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = availableProblems.filter(problem => 
        problem.title.toLowerCase().includes(lowerCaseQuery) || 
        (problem.tags && problem.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
      );
      setFilteredProblems(filtered);
    }
  }, [searchQuery, availableProblems]);

  // Redirect if not logged in
  if (status === 'unauthenticated') {
    router.push(`/auth/signin?callbackUrl=/groups/${groupId}/create-challenge`);
    return null;
  }

  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Handle adding a problem to the selection
  const addProblem = (problem) => {
    if (!selectedProblems.some(p => p.id === problem.id)) {
      setSelectedProblems([...selectedProblems, problem]);
    }
  };

  // Handle removing a problem from the selection
  const removeProblem = (problemId) => {
    setSelectedProblems(selectedProblems.filter(p => p.id !== problemId));
  };

  const onSubmit = async (data) => {
    if (selectedProblems.length === 0) {
      toast.error('Please select at least one problem for the challenge');
      return;
    }
    
    if (new Date(data.startTime) >= new Date(data.endTime)) {
      form.setError("endTime", { 
        type: "manual", 
        message: "End time must be after start time" 
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/groups/${groupId}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          problemIds: selectedProblems.map(p => p.id),
          isCustom: false
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create challenge');
      }
      
      toast.success('Challenge created successfully!');
      router.push(`/groups/${groupId}/challenges/${responseData.id}`);
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error(error.message || 'Failed to create challenge');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyBadgeVariant = (difficulty) => {
    switch(difficulty) {
      case 'EASY': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HARD': return 'danger';
      default: return 'default';
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch(difficulty) {
      case 'EASY': return <LightbulbIcon className="h-3.5 w-3.5 mr-1" />;
      case 'MEDIUM': return <BrainCircuit className="h-3.5 w-3.5 mr-1" />;
      case 'HARD': return <Rocket className="h-3.5 w-3.5 mr-1" />;
      default: return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="container py-10 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-1"
            asChild
          >
            <Link href={`/groups/${groupId}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Group
            </Link>
          </Button>
        </div>
        
        <Card className="bg-card border-0 shadow-lg">
          <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg border-b">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4 shadow-md">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Create New Challenge</CardTitle>
            <CardDescription className="text-lg">
              For {group?.name}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Challenge Title</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter a descriptive title for your challenge" 
                              className="text-base py-6"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Challenge Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Provide details about the challenge, goals, and any special rules"
                              className="resize-y min-h-[120px] text-base"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription className="flex items-center gap-1">
                            <Info className="h-3.5 w-3.5" />
                            Optional. Markdown formatting is supported.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Start Time</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">End Time</FormLabel>
                        <FormControl>
                          <DateTimePicker
                            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-x-4 rounded-md p-4 bg-muted/40">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Visibility</FormLabel>
                            <FormDescription>
                              Make challenge visible to all group members
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              
                <Separator className="my-8" />
                
                <div id="select-problems-section">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <Code className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-medium">Select Problems</h3>
                  </div>
                  
                  {/* Selected problems */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-base font-medium">Selected Problems</h4>
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        {selectedProblems.length} selected
                      </Badge>
                    </div>
                    
                    {selectedProblems.length === 0 ? (
                      <div className="bg-muted/50 rounded-md p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
                        <Flag className="h-6 w-6 mb-1 opacity-60" />
                        <p>No problems selected yet.</p>
                        <p className="text-sm">Select problems from the list below to include in this challenge.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedProblems.map(problem => (
                          <div key={problem.id} className="flex items-center justify-between bg-card border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-3">
                              <Badge 
                                variant={getDifficultyBadgeVariant(problem.difficulty)} 
                                className="flex items-center"
                              >
                                {getDifficultyIcon(problem.difficulty)}
                                {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()}
                              </Badge>
                              <span className="font-medium truncate">{problem.title}</span>
                            </div>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => removeProblem(problem.id)}
                              className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Problem search */}
                  <div className="relative mb-4">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Search className="h-4 w-4" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Search problems by title or tags..."
                      className="pl-10 py-6"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Available problems list */}
                  <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[40px]"></TableHead>
                          <TableHead>Problem</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead className="w-[100px] text-right">Add</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProblems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                              <div className="flex flex-col items-center">
                                <Search className="h-8 w-8 mb-2 opacity-40" />
                                {availableProblems.length === 0 
                                  ? "No problems available." 
                                  : "No problems match your search criteria."}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProblems.map(problem => (
                            <TableRow key={problem.id} className="group hover:bg-muted/30">
                              <TableCell className="pr-0">
                                <Checkbox 
                                  checked={selectedProblems.some(p => p.id === problem.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      addProblem(problem);
                                    } else {
                                      removeProblem(problem.id);
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{problem.title}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={getDifficultyBadgeVariant(problem.difficulty)}
                                  className="flex items-center w-fit"
                                >
                                  {getDifficultyIcon(problem.difficulty)}
                                  {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {problem.tags && problem.tags.map((tag, i) => (
                                    <Badge 
                                      key={i} 
                                      variant="info"
                                      className="text-xs"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant={selectedProblems.some(p => p.id === problem.id) ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        if (selectedProblems.some(p => p.id === problem.id)) {
                                          removeProblem(problem.id);
                                        } else {
                                          addProblem(problem);
                                        }
                                      }}
                                      className="gap-1 transition-all"
                                    >
                                      {selectedProblems.some(p => p.id === problem.id) ? (
                                        <>
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Added
                                        </>
                                      ) : (
                                        'Add'
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {selectedProblems.some(p => p.id === problem.id) 
                                      ? 'Remove from challenge' 
                                      : 'Add to challenge'}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Button 
                    type="submit" 
                    className="min-w-36 py-6 text-base flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                    disabled={isSubmitting || selectedProblems.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                        Creating Challenge...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Create Challenge
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
} 