/* 예배PPT 관리 시스템 — 내장 샘플 데이터 (주보 원문 그대로)
   찬송 가사·교독문 전문은 저작권 자료라 비워 둠. 자료실에서 직접 등록하면 됨.
   성경 본문은 개역개정 초안 — 예배 전 확인 필요. */
const SAMPLE_WORSHIPS = [
  {
    id: "sunday-morning",
    name: "주일 낮 예배",
    time: "오전 10:30",
    season: "추수감사절",
    leader: "김윤호 목사",
    date: "",
    motto: "하나님은 영이시니 신령과 진정으로 예배할찌니라",
    mottoRef: "요4:24",
    note: "※표는 일어서세요",
    orders: [
      { kind: "묵도", detail: "주악", person: "다 같이" },
      { kind: "기원", detail: "", person: "다 같이" },
      { kind: "찬송", detail: "", hymnTong: "13", hymnSae: "", person: "다 같이" },
      { kind: "성시교독", detail: "", 교독Tong: "52", 교독Sae: "", person: "다 같이" },
      { kind: "신앙고백", detail: "사도신경", person: "다 같이" },
      { kind: "찬송", detail: "", hymnTong: "306", hymnSae: "", person: "다 같이" },
      { kind: "대표기도", detail: "", person: "윤미숙 집사" },
      { kind: "성경봉독", detail: "", bible: "신16:13~17", person: "사회자" },
      { kind: "특별찬송", detail: "", person: "자원성가대" },
      { kind: "말씀", detail: "", sermon: "진정한 감사절", person: "김윤호 목사" },
      { kind: "기도", detail: "", person: "설교자" },
      { kind: "찬송", detail: "", hymnTong: "373", hymnSae: "", person: "다 같이" },
      { kind: "헌금", detail: "", person: "다 같이" },
      { kind: "봉헌기도", detail: "", person: "김윤호 목사" },
      { kind: "교회소식", detail: "", person: "사회자" },
      { kind: "찬송", detail: "", hymnTong: "01", hymnSae: "", person: "다 같이" },
      { kind: "축도", detail: "", person: "김윤호 목사" }
    ]
  },
  {
    id: "sunday-evening",
    name: "주일저녁 찬양예배",
    time: "오후 6:30",
    season: "",
    leader: "김영숙 전도사",
    date: "",
    motto: "너희 몸을 하나님이 기뻐하시는 거룩한 산 제사로 드리라",
    mottoRef: "롬12:1",
    note: "",
    orders: [
      { kind: "신앙고백", detail: "주악", person: "다 같이" },
      { kind: "찬송", detail: "", hymnTong: "93", hymnSae: "", person: "다 같이" },
      { kind: "기도", detail: "합심기도회", person: "합심기도회" },
      { kind: "성경봉독", detail: "", bible: "히2:1~4", person: "사회자" },
      { kind: "특별찬송", detail: "", person: "가족찬양대" },
      { kind: "말씀", detail: "", sermon: "더욱 간절히 삼갈 것", person: "김윤호 목사" },
      { kind: "기도", detail: "", person: "설교자" },
      { kind: "찬송", detail: "", hymnTong: "351", hymnSae: "", person: "다 같이" },
      { kind: "교회소식", detail: "", person: "사회자" },
      { kind: "찬송", detail: "", person: "다 같이" },
      { kind: "축도", detail: "", hymnTong: "502", hymnSae: "", person: "김윤호 목사" }
    ]
  },
  {
    id: "wednesday-prayer",
    name: "삼일 기도회",
    time: "오후 6:30",
    season: "",
    leader: "김윤호 목사",
    date: "",
    motto: "",
    mottoRef: "",
    note: "",
    orders: [
      { kind: "찬송", detail: "", hymnTong: "208, 492, 533", hymnSae: "", person: "다 같이" },
      { kind: "기도", detail: "합심기도회", person: "합심기도회" },
      { kind: "성경봉독", detail: "", bible: "약3:13~18", person: "사회자" },
      { kind: "말씀", detail: "", sermon: "참된 지혜", person: "김영숙 전도사" }
    ]
  },
  {
    id: "dawn-prayer",
    name: "새벽 기도회",
    time: "오전 4:30",
    season: "",
    leader: "김윤호 목사",
    date: "",
    motto: "구하는 이마다 얻을 것이요 찾는 이가 찾을 것이요 두드리는 이에게 열릴 것이니라",
    mottoRef: "마7:8",
    note: "",
    orders: [
      { kind: "인도", detail: "", person: "김윤호 목사" },
      { kind: "말씀", detail: "구하는 이마다 얻을 것이요 찾는 이가 찾을 것이요 두드리는 이에게 열릴 것이니라", bible: "마7:8", person: "김윤호 목사" }
    ]
  }
];

/* 참고표 — 주보 원문대로, PPT에는 포함하지 않음 */
const REFERENCE_TABLES = {
  service: {
    title: "예배 봉사 위원",
    headers: ["구분", "금주", "다음주"],
    rows: [
      ["특별찬송", "자원성가", "자원성가"],
      ["저녁기도", "자유기도", "자유기도"],
      ["11월헌금", "김명심", "김명심"],
      ["청소담당", "합심청소", "합심청소"],
      ["11월안내", "정정상", "정정상"],
      ["중식봉사", "헌신자", "헌신자"],
      ["중(자원)식", "김영숙", "윤미숙"],
      ["꽃꽂이", "자원함", "자원함"]
    ]
  },
  prayer: {
    title: "기도 담당자 — 11월",
    headers: ["주", "주일 낮 예배", "주일저녁 찬양예배", "삼일 기도회"],
    rows: [
      ["1주", "김영숙 전도사", "서용덕 집사", "합심 기도회"],
      ["2주", "김연욱 집사", "유순자 권사", "합심 기도회"],
      ["3주", "윤미숙 집사", "정정상 집사", "합심 기도회"],
      ["4주", "문남희 권사", "박상현 집사", "합심 기도회"],
      ["5주", "김정은 권사", "감명심 집사", "합심 기도회"]
    ]
  },
  district: {
    title: "구역 예배 보고",
    headers: ["구역", "구역장", "재적", "출석", "헌금", "장소", "다음 전(인)도", "성경"],
    rows: [
      ["1구역", "김영숙", "5", "4", "30,000", "김명심", "서용덕", "62"],
      ["2구역", "윤미숙", "5", "4", "50,000", "서 재", "윤미숙", "30"],
      ["3구역", "", "", "", "", "", "", ""],
      ["4구역", "", "", "", "", "", "", ""],
      ["5구역", "", "", "", "", "", "", ""]
    ],
    footnote: "2026년도 구역표어 : 구역 사랑, 이웃 사랑"
  }
};
