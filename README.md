# 바벨노트

광고 없는 개인 운동 기록 앱(PWA). 데이터는 폰 안(IndexedDB)에만 저장한다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173/barbell-note/
npm test           # 단위 테스트
npm run typecheck  # 타입 검사
```

## 구조

- `src/pages` 화면 (오늘, 계획, 능력 입력, 기록, 통계, 운동 목록)
- `src/components` 공통 조각 (노란 띠, 하단 탭, 아래 창, 알림, 원판 그림, 휴식 타이머)
- `src/hooks` 공통 훅 (운동 중 화면 꺼짐 방지)
- `src/db` 저장소 (Dexie 스키마, 기본 운동 채우기)
- `src/data/exercises.ko.json` 기본 운동 59종
- `src/lib` 계산 규칙 (1RM, 계획 생성, 계획 시안, 원판 계산, 운동 진행)
- `src/styles/tokens.css` 색, 글꼴, 간격

## 브랜치

`dev`에서 개발하고 `main`에 병합하면 GitHub Actions가 GitHub Pages로 배포한다.
