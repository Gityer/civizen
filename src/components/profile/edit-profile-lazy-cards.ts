import { lazy } from 'react';

export const EditProfileSocialCard = lazy(() =>
  import('@/components/profile/EditProfileSocialCard').then((module) => ({
    default: module.EditProfileSocialCard,
  })),
);

export const EditProfileWorldCitizenCard = lazy(() =>
  import('@/components/profile/EditProfileWorldCitizenCard').then((module) => ({
    default: module.EditProfileWorldCitizenCard,
  })),
);
