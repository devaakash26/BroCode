import SignUpForm from '@/app/components/auth/signup-form';

export const metadata = {
  title: 'Sign Up - NeetCode',
  description: 'Create your NeetCode account',
};

export default function SignUpPage() {
  return (
    <div className="container relative flex h-[calc(100vh-5rem)] flex-col items-center justify-center">
      <SignUpForm />
    </div>
  );
} 