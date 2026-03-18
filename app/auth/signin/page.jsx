import SignInForm from '@/app/components/auth/signin-form';
import InteractiveBackground from '@/app/components/auth/interactive-background';

export const metadata = {
  title: 'Sign In - BroCode',
  description: 'Sign in to your BroCode account',
};

export default function SignInPage() {
  return (
    <div className="min-h-screen relative">
      <InteractiveBackground>
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <SignInForm />
          </div>
        </div>
      </InteractiveBackground>
    </div>
  );
}

