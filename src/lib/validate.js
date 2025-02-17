export function validateQuestionForm(data, questions) {
  const { category, question, answer1, answer2, answer3, answer4, answer_correct } = data;

  if (!category?.length) return 'Flokkur verður að vera valinn';
  if (!question?.length) return 'Spurning má ekki vera tóm';
  if (!answer1?.length || !answer2?.length || !answer3?.length || !answer4?.length) return 'Svar má ekki vera tómt';
  if (!answer_correct?.length) return 'Rétt svar verður að vera valið';
  if (question.length < 10) return 'Spurning verður að vera a.m.k. 10 stafir';
  if (question.length > 512) return 'Spurning má ekki vera lengri en 512 stafir';
  if (answer1.length > 512) return 'Svar 1 má ekki vera lengra en 512 stafir';
  if (answer2.length > 512) return 'Svar 2 má ekki vera lengra en 512 stafir';
  if (answer3.length > 512) return 'Svar 3 má ekki vera lengra en 512 stafir';
  if (answer4.length > 512) return 'Svar 4 má ekki vera lengra en 512 stafir';

  if (answer1 === answer2 || answer1 === answer3 || answer1 === answer4 ||
    answer2 === answer3 || answer2 === answer4 || answer3 === answer4) {
    return 'Svör þurfa að vera ólík';
  }

  if (!questions) return 'Villa við að sækja gögn.';

  const questionExists = questions.some(
    (q) => q.question.toLowerCase() === question.toLowerCase()
  );
  if (questionExists) return 'Spurning er nú þegar til í gagnagrunni';

  return null;
}
