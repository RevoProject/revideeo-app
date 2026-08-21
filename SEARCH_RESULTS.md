# Search Results: ReVideeo Project Exploration

## 1. Project Type
- **Language/Framework**: React 19 + TypeScript with Vite
- **Key Dependencies**: 
  - `react` ^19.2.8, `react-dom` ^19.2.8
  - `remotion` ^4.0.505 (video editing framework)
  - `@tailwindcss/vite` ^4.3.3, `tailwindcss` ^4.3.3
  - `lucide-react` ^1.28.0 (icons)
- **Build Tool**: Vite
- **Package Manager**: pnpm

## 2. "Biblioteka projektów" (Library Projects Window)
- **File**: `src/components/modals/LibraryModal.tsx`
- **Description**: Modal window displaying stored projects in a grid
- **Project items show**: name, resolution label, orientation
- **Buttons per project**:
  - "Otwórz" (Open) - blue text, calls `onOpen(project)`
  - "Usuń" (Delete) - red text, calls `onDelete(project)`
- **Bottom button**: "Importuj z dysku" - imports new project from disk

## 3. "Open" Functionality Buttons

### LibraryModal.tsx
- Line 45: `<button onClick={() => onOpen(project)} className="...">Otwórz</button>` - opens project from library
- Line 47: `<FolderOpen size={18} className="text-blue-400" />` - folder icon next to project name

### StartModal.tsx
- Line 45: `<button onClick={() => onOpen(project)} className="...">Otwórz</button>` - recent projects section
- Line 53: `<span className="text-xs font-semibold text-blue-400">Otwórz</span>` - label on recent project button
- Line 38-39: Remote projects "Wczytaj" (Load) button
- Line 63: "Ustawienia" (Settings) button - opens app settings modal

### ToolsMenu.tsx
- Line 23: `<button onClick={onOpenProperties} className={toolButton}>` - opens properties panel
- Line 27: `<button onClick={onOpenTransitions} className={toolButton}>` - opens transitions panel
- Line 31: `<button onClick={onOpenAudio} className={toolButton}>` - opens audio mixer
- Line 35: `<button onClick={onOpenAnimations} className={toolButton}>` - opens animations panel
- Line 39: `<button onClick={onOpenExtra} className={toolButton}>` - opens extra panel

### MobileEditorShell.tsx
- Line 205: `<button onClick={onOpenProject} className="...">` - opens project in header
- Line 262: `<button onClick={onOpenSettings} ...>` - opens settings sheet
- Lines 315-324: Bottom navigation buttons that open various sheets (media, properties, transitions, etc.)

### Header.tsx
- Line 64: "Nowy projekt" (New project) button - creates new project
- Line 70: "Importuj projekt z pliku" (Import project from file) button
- Line 122: "Eksportuj film" (Export film) button
- Line 125: "Eksportuj projekt" (Export project) button

## 4. Button Components Summary

| Component | File | Key "Open" Buttons |
|---|---|---|
| LibraryModal | `src/components/modals/LibraryModal.tsx` | "Otwórz" per project |
| StartModal | `src/components/modals/StartModal.tsx` | "Otwórz" (local/remote), "Nowy projekt" |
| ToolsMenu | `src/editor/tools/ToolsMenu.tsx` | Properties, Transitions, Audio, Animations, Extra |
| MobileEditorShell | `src/mobile/MobileEditorShell.tsx` | onOpenProject, onOpenSettings, sheet navigation |
| Header | `src/components/layout/Header.tsx` | Nowy projekt, Import, Eksportuj film/projekt |