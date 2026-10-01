import React from 'react';
import { createAvatar, type AvatarController, Avatar, type AvatarProps } from '@bible-strong/avatar-react';
import '@bible-strong/avatar-react/styles.css';
import defaultMascotJson from '../assets/mascot.avatar.json';

// Concrete typed component from the default definition
export const MrCleanMascot = createAvatar(defaultMascotJson as any);

export { defaultMascotJson };
export type { AvatarController, AvatarProps };
