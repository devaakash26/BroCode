import SignInForm from '@/app/components/auth/signin-form';

export const metadata = {
  title: 'Sign In - NeetCode',
  description: 'Sign in to your NeetCode account',
};

export default function SignInPage() {
  return (
    <div className="container relative flex h-[calc(100vh-5rem)] flex-col items-center justify-center">
      <SignInForm />
    </div>
  );
} 