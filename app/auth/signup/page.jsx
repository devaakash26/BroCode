import SignUpForm from '@/app/components/auth/signup-form';
import InteractiveBackground from '@/app/components/auth/interactive-background';

export const metadata = {
  title: 'Sign Up - BroCode',
  description: 'Create your BroCode account',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen relative">
      <InteractiveBackground>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <SignUpForm />
          </div>
        </div>
      </InteractiveBackground>
    </div>
  );
} 
