import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IFaculty } from '@models/faculty/faculty.model';
import { IProgramVersion } from '@models/program/program-version.model';
import { IProgram } from '@models/program/program.model';
import { StatusChipComponent } from '@widget/status-chip/status-chip.component';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-home-version-selector',
  templateUrl: './home-version-selector.component.html',
  styleUrl: './home-version-selector.component.css',
  imports: [CommonModule, FormsModule, NzSelectModule, StatusChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeVersionSelectorComponent {
  readonly faculties = input<IFaculty[]>([]);
  readonly selectedFacultyId = input<string | null>(null);
  readonly isLoadingFaculties = input<boolean>(false);

  readonly programs = input<IProgram[]>([]);
  readonly selectedProgramId = input<string | null>(null);
  readonly isLoadingPrograms = input<boolean>(false);

  readonly filteredVersions = input<IProgramVersion[]>([]);
  readonly availableCohorts = input<string[]>([]);
  readonly selectedCohort = input<string | null>(null);
  readonly selectedVersionId = input<string | null>(null);
  readonly isLoadingVersions = input<boolean>(false);

  readonly facultyChange = output<string | null>();
  readonly programChange = output<string | null>();
  readonly cohortChange = output<string | null>();
  readonly versionChange = output<string | null>();

  readonly selectedVersionObj = computed<IProgramVersion | null>(
    () => this.filteredVersions().find(v => v.id === this.selectedVersionId()) ?? null,
  );
}
