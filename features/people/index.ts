export type Role = "requester" | "manager" | "analyst";

export type SessionUser = {
  id: string;
  name: string;
  role: Role;
  department: string;
  division: string;
  rank: string;
};

export const ROLE_LABEL: Record<Role, string> = {
  requester: "의뢰자",
  manager: "해석관리자",
  analyst: "해석담당자",
};

// 실제 로그인이 없는 동안 화면에서 전환해 쓰는 임시 샘플 사용자.
export const sampleUsers: SessionUser[] = [
  { id: "u-kim", name: "김민준", role: "requester", department: "실외기설계팀", division: "SAC", rank: "선임연구원" },
  { id: "u-lee", name: "이서연", role: "requester", department: "실외기설계팀", division: "SAC", rank: "연구원" },
  { id: "u-park", name: "박지훈", role: "requester", department: "윈도우설계팀", division: "RAC", rank: "책임연구원" },
  { id: "u-choi", name: "최해석", role: "manager", department: "해석팀", division: "연구소", rank: "책임연구원" },
  { id: "u-jung", name: "정담당", role: "analyst", department: "해석팀", division: "연구소", rank: "선임연구원" },
];

export function findUser(id: string): SessionUser | undefined {
  return sampleUsers.find((user) => user.id === id);
}
