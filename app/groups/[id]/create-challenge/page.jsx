'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Flag, CheckCircle2, FileEdit, BookOpen, Code, X, Search } from 'lucide-react';
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

  return (
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
      
      <Card className="bg-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-primary/10 rounded-full mb-4">
            <FileEdit className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create New Challenge</CardTitle>
          <CardDescription>
            For {group?.name}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Challenge Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter a descriptive title for your challenge" 
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
                        <FormLabel>Challenge Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide details about the challenge, goals, and any special rules"
                            className="resize-y"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
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
                      <FormLabel>Start Time</FormLabel>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            className="pl-10" 
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            className="pl-10" 
                            {...field} 
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-muted/40">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Make challenge visible to all group members</FormLabel>
                          <FormDescription>
                            If unchecked, only admins can see this challenge until it begins
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            
              <Separator className="my-6" />
              
              <div id="select-problems-section">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium">Select Problems</h3>
                  </div>
                </div>
                
                {/* Selected problems */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-2">Selected Problems ({selectedProblems.length})</h4>
                  
                  {selectedProblems.length === 0 ? (
                    <div className="bg-muted/50 rounded-md p-4 text-center text-muted-foreground">
                      No problems selected yet. Select problems from the list below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedProblems.map(problem => (
                        <div key={problem.id} className="flex items-center justify-between bg-card border rounded-md p-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              problem.difficulty === 'EASY' ? 'bg-green-500' : 
                              problem.difficulty === 'MEDIUM' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-medium">{problem.title}</span>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeProblem(problem.id)}
                            className="text-muted-foreground hover:text-destructive"
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    type="text"
                    placeholder="Search problems by title or tags"
                    className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {/* Available problems list */}
                <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                        <TableHead>Problem</TableHead>
                            <TableHead>Difficulty</TableHead>
                            <TableHead>Tags</TableHead>
                        <TableHead className="w-[100px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProblems.length === 0 ? (
                            <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            {availableProblems.length === 0 
                              ? "No problems available." 
                              : "No problems match your search."}
                              </TableCell>
                            </TableRow>
                          ) : (
                        filteredProblems.map(problem => (
                          <TableRow key={problem.id}>
                            <TableCell className="font-medium">{problem.title}</TableCell>
                                <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                problem.difficulty === 'EASY' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 
                                problem.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                    {problem.difficulty.charAt(0) + problem.difficulty.slice(1).toLowerCase()}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                {problem.tags && problem.tags.map((tag, i) => (
                                      <span 
                                    key={i} 
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addProblem(problem)}
                                disabled={selectedProblems.some(p => p.id === problem.id)}
                              >
                                {selectedProblems.some(p => p.id === problem.id) ? 'Added' : 'Add'}
                              </Button>
                            </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={isSubmitting || selectedProblems.length === 0}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Challenge...
                  </span>
                ) : 'Create Challenge'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 