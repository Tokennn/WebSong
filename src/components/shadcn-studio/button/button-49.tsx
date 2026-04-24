import { ArrowUpRightIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { CraftButton, CraftButtonLabel, CraftButtonIcon } from '@/components/ui/craft-button';

const CraftButtonDemo = () => {
  return (
    <CraftButton asChild>
      <Link to="/dome-gallery">
        <CraftButtonLabel>Open Gallery</CraftButtonLabel>
        <CraftButtonIcon>
          <ArrowUpRightIcon className="size-3 stroke-2 transition-transform duration-500 group-hover:rotate-45" />
        </CraftButtonIcon>
      </Link>
    </CraftButton>
  );
};

export default CraftButtonDemo;
