import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IFaculty } from '@models/faculty/faculty.model';
import { IProgram } from '@models/program/program.model';

export interface IProgramFacultyChip {
  id: string;
  code: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-home-program-picker',
  templateUrl: './home-program-picker.component.html',
  styleUrl: './home-program-picker.component.css',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeProgramPickerComponent {
  readonly programs = input<IProgram[]>([]);
  readonly faculties = input<IFaculty[]>([]);
  readonly loading = input<boolean>(false);

  readonly openVersions = output<IProgram>();
  readonly openSyllabi = output<IProgram>();

  readonly searchQuery = signal<string>('');
  readonly selectedFacultyId = signal<string | null>(null);

  readonly facultyChips = computed<IProgramFacultyChip[]>(() => {
    const counts = new Map<string, IProgramFacultyChip>();
    const facultyList = this.faculties();

    for (const prog of this.programs()) {
      const fid = prog.facultyId;
      if (!fid) {
        continue;
      }
      const existing = counts.get(fid);
      if (existing) {
        existing.count += 1;
        continue;
      }
      const matched = facultyList.find(f => f.id === fid);
      const code = matched?.code ?? prog.facultyCode ?? 'KHOA';
      const name = matched?.name ?? prog.facultyName ?? fid;
      counts.set(fid, { id: fid, code, name, count: 1 });
    }

    return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  });

  readonly filteredPrograms = computed<IProgram[]>(() => {
    const fid = this.selectedFacultyId();
    const query = this.searchQuery().trim().toLowerCase();

    return this.programs().filter(prog => {
      if (fid && prog.facultyId !== fid) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = [
        prog.code,
        prog.name,
        this.getFacultyLabel(prog),
        prog.level,
        prog.degree,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  readonly hasActiveFilters = computed<boolean>(
    () => this.selectedFacultyId() !== null || this.searchQuery().trim().length > 0,
  );

  selectFaculty(facultyId: string | null): void {
    this.selectedFacultyId.set(facultyId);
  }

  clearFilters(): void {
    this.selectedFacultyId.set(null);
    this.searchQuery.set('');
  }

  getFacultyLabel(prog: IProgram): string {
    if (prog.facultyName) {
      return prog.facultyName;
    }
    if (!prog.facultyId) {
      return '—';
    }
    const found = this.faculties().find(f => f.id === prog.facultyId);
    return found ? `${found.code} — ${found.name}` : prog.facultyId;
  }
}
