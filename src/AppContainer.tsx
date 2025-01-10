import { EventData, Frame, Page } from '@nativescript/core';
import { BaseNavigationContainer } from '@react-navigation/core';
import * as React from 'react';
import { MainScreen } from './screens/MainScreen';

export function AppContainer() {
  return (
    <BaseNavigationContainer>
      <Frame defaultPage={MainScreen} />
    </BaseNavigationContainer>
  );
}