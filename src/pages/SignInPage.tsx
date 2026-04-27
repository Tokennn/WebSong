import { Headphones } from 'lucide-react';

import { AuthComponent } from '@/components/ui/sign-up';

const SignInLogo = () => (
  <div className="rounded-md bg-zinc-100 p-1.5 text-zinc-900">
    <Headphones className="h-4 w-4" />
  </div>
);

export default function SignInPage() {
  return (
    <AuthComponent
      logo={<SignInLogo />}
      brandName=""
      useGradientBackground={false}
      communityTypography={true}
      showHeader={false}
      className="bg-[#0b0920]"
    />
  );
}
