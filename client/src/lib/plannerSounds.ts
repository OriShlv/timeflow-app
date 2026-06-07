import notificationSound from '../assets/sounds/notification.mp3';
import popSound from '../assets/sounds/pop.mp3';

const POP_VOLUME = 0.2;
const NOTIFICATION_VOLUME = 0.2;

let popAudio: HTMLAudioElement | null = null;
let notificationAudio: HTMLAudioElement | null = null;

function getPopAudio(): HTMLAudioElement {
  if (popAudio === null) {
    popAudio = new Audio(popSound);
    popAudio.volume = POP_VOLUME;
  }
  return popAudio;
}

function getNotificationAudio(): HTMLAudioElement {
  if (notificationAudio === null) {
    notificationAudio = new Audio(notificationSound);
    notificationAudio.volume = NOTIFICATION_VOLUME;
  }
  return notificationAudio;
}

function playAudio(audio: HTMLAudioElement): void {
  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}

export function playPlannerPopSound(): void {
  playAudio(getPopAudio());
}

export function playPlannerNotificationSound(): void {
  playAudio(getNotificationAudio());
}
