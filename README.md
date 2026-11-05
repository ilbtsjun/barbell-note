# 바벨노트

광고 없는 개인 운동 기록 앱(PWA). 데이터는 폰 안(IndexedDB)에만 저장한다.

주소: https://ilbtsjun.github.io/barbell-note/

## 폰에 설치하기

- **안드로이드(Chrome)**: 주소를 열고 오른쪽 위 메뉴(점 세 개) > "홈 화면에 추가" 또는 "앱 설치"를 누른다.
- **아이폰(Safari)**: 주소를 열고 아래 공유 버튼 > "홈 화면에 추가"를 누른다. Safari에서만 설치할 수 있다.

설치하면 주소창 없이 앱처럼 열리고, 인터넷이 없어도 쓸 수 있다. 새 버전이 나오면 화면 위에 알림이 뜬다.

## 백업

기록은 그 폰에만 있다. 폰을 바꾸거나 앱을 지우기 전에 내 정보 탭 맨 아래 "데이터 관리"에서 백업 파일을 내려받고, 새 폰에서 "백업 불러오기"로 되돌린다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173/barbell-note/
npm test           # 단위 테스트
npm run typecheck  # 타입 검사
npm run build      # 배포용 빌드 (dist)
```

## 구조

- `src/pages` 화면 (오늘, 계획, 능력 입력, 기록, 통계, 내 정보, 운동 목록)
- `src/components` 공통 조각 (노란 띠, 하단 탭, 아래 창, 알림, 원판 그림, 휴식 타이머)
- `src/hooks` 공통 훅 (운동 중 화면 꺼짐 방지)
- `src/db` 저장소 (Dexie 스키마, 기본 운동 채우기, 백업)
- `src/data/exercises.ko.json` 기본 운동 69종 (근력 59, 유산소 10)
- `src/lib` 계산 규칙 (1RM, 계획 생성, 계획 시안, 원판 계산, 운동 진행)
- `src/styles/tokens.css` 색, 글꼴, 간격

## 브랜치

`dev`에서 개발하고 `main`에 병합하면 GitHub Actions가 GitHub Pages로 배포한다.
