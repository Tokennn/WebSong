import { Layers3 } from 'lucide-react';

import { AuthComponent } from '@/components/ui/sign-up';

const CustomLogo = () => (
  <div className="rounded-md bg-blue-500 p-1.5 text-white">
    <Layers3 className="h-4 w-4" />
  </div>
);

export default function CustomAuthDemo() {
  return <AuthComponent logo={<CustomLogo />} brandName="MyWebApp" />;
}
