import React from 'react';
import { Splitter } from '@components/Splitter';
import { FolderView } from './FolderView';
import { FileView } from './FileView';

import './styles.scss';

export const ClassView = () => <Splitter initialWidths={[25,75]}><FolderView/><FileView /></Splitter>