import { fromMinutes } from "./dates";

/** Half-hour clock options between the club's opening and closing time. */
export function halfHours(from = 5 * 60, to = 22 * 60): string[] {
  const list: string[] = [];
  for (let minutes = from; minutes <= to; minutes += 30) list.push(fromMinutes(minutes));
  return list;
}
