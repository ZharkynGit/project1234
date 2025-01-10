import { Application } from '@nativescript/core';
import { AppContainer } from './src/AppContainer';

Application.run({ create: () => new AppContainer() });