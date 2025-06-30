'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    ACCEPTED: 'bg-green-500 hover:bg-green-600',
    WRONG_ANSWER: 'bg-red-500 hover:bg-red-600',
    TIME_LIMIT_EXCEEDED: 'bg-yellow-500 hover:bg-yellow-600',
    MEMORY_LIMIT_EXCEEDED: 'bg-yellow-500 hover:bg-yellow-600',
    RUNTIME_ERROR: 'bg-purple-500 hover:bg-purple-600',
    COMPILATION_ERROR: 'bg-gray-500 hover:bg-gray-600',
    PENDING: 'bg-blue-500 hover:bg-blue-600',
  };

  return (
    <Badge className={`${statusConfig[status] || 'bg-gray-400'} text-white`}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

const SubmissionsClient = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await fetch('/api/submissions');
        if (!res.ok) {
          throw new Error('Failed to fetch submissions');
        }
        const data = await res.json();
        setSubmissions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center text-gray-500">
        <p>You haven't made any submissions yet.</p>
        <Link href="/problems" className="text-blue-500 hover:underline">
          Start solving problems
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Problem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Language</TableHead>
            <TableHead className="text-right">Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map(submission => (
            <TableRow key={submission.id}>
              <TableCell>
                <Link
                  href={`/problems/${submission.problem.id}`}
                  className="hover:underline"
                >
                  {submission.problem.title}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={submission.status} />
              </TableCell>
              <TableCell>{submission.language}</TableCell>
              <TableCell className="text-right">
                {new Date(submission.submittedAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default SubmissionsClient; 