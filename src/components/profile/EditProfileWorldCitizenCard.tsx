import { CarouselItem } from '@/components/ui/carousel';
import { EditProfileWorldCitizenBack } from './EditProfileWorldCitizenBack';
import { EditProfileWorldCitizenFront } from './EditProfileWorldCitizenFront';
import type { WorldCitizenCardProps } from './edit-profile-card-types';

export function EditProfileWorldCitizenCard(props: WorldCitizenCardProps) {
  const { toggleWorldCitizenCardSide, worldCitizenCardSide } = props;

  return (
    <CarouselItem className="pl-0">
      <div
        className="cursor-pointer"
        style={{ aspectRatio: '1.36 / 1', perspective: '1600px' }}
        role="button"
        tabIndex={0}
        data-build-key="editProfileWorldCitizenCard"
        data-build-label="Layer - ID Card"
        aria-label={`World Citizen ID ${worldCitizenCardSide === 'front' ? 'front' : 'back'}`}
        onClick={toggleWorldCitizenCardSide}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleWorldCitizenCardSide();
          }
        }}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 transform-3d"
          style={{
            transform: worldCitizenCardSide === 'front' ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <EditProfileWorldCitizenFront {...props} />
          <EditProfileWorldCitizenBack {...props} />
        </div>
      </div>
    </CarouselItem>
  );
}
