/** Hand-written Russian for the `governanceHub` / `common` keys used by the governance dashboard and steward console. */
export const governanceHubRu = {
  governanceHub: {
    yourVote: 'Ваш голос: {choice}',
    voteBlocked: 'Сейчас вы не можете голосовать по предложениям управления.',
    voteBlockedBySanction: 'Голосование заблокировано, пока действует ваша санкция в системе управления.',
    statuses: {
      open: 'Открыто',
      approved: 'Одобрено',
      rejected: 'Отклонено',
      cancelled: 'Отменено',
    },
    voteChoices: {
      approve: 'За',
      reject: 'Против',
      abstain: 'Воздержаться',
    },
    decisionClasses: {
      ordinary: 'Обычное',
      elevated: 'Повышенное',
      constitutional: 'Конституционное',
    },
    stewardIdentity: {
      title: 'Подтверждения личности',
      duplicateIdentity: 'Не одобрено: этот документ совпадает с уже подтверждённым аккаунтом. Дело помечено.',
      pendingCount: 'Ожидают: {count}',
      empty: 'Нет подтверждений личности, ожидающих проверки.',
      notAuthorized: 'У вас нет прав проверять подтверждения личности.',
      loadFailed: 'Не удалось загрузить подтверждения личности.',
      approve: 'Одобрить',
      reject: 'Отклонить',
      approveSuccess: 'Подтверждение личности одобрено.',
      rejectSuccess: 'Подтверждение личности отклонено.',
      reviewFailed: 'Не удалось сохранить решение по проверке.',
      approvedNote: 'Одобрено после проверки документа, удостоверяющего личность, и фотографии лица.',
      rejectedNote: 'Отклонено после проверки документа, удостоверяющего личность, и фотографии лица.',
      submittedAt: 'Отправлено: {date}',
      idDocument: 'Документ, удостоверяющий личность',
      selfie: 'Фото лица',
      missingArtifact: 'Файл не загружен.',
    },
  },
  common: {
    anonymousUser: 'Анонимный пользователь',
  },
};
