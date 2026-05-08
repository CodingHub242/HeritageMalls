import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TutorialPage } from './tutorial.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    TutorialPage,
    RouterModule.forChild([
      {
        path: '',
        component: TutorialPage
      }
    ])
  ]
})
export class TutorialPageModule {}
