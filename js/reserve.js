document.addEventListener('DOMContentLoaded', () => {
    const reserveForm = document.getElementById('reserveForm');
    
    // 🔥 알려주신 Worker 주소로 API 엔드포인트 설정 완료
    const WORKER_URL = 'https://reservation-api.tonycho999.workers.dev/api/reserve';

    if (reserveForm) {
        reserveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = reserveForm.querySelector('.submit-btn');
            submitBtn.textContent = '예약 처리 중...';
            submitBtn.disabled = true;

            const data = {
                name: document.getElementById('name').value,
                phone: document.getElementById('phone').value,
                people: document.getElementById('people').value,
                date: document.getElementById('date').value
            };

            try {
                const response = await fetch(WORKER_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('예약이 성공적으로 접수되었습니다!');
                    reserveForm.reset();
                } else {
                    alert('예약 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('네트워크 오류가 발생했습니다.');
            } finally {
                submitBtn.textContent = '예약 신청하기';
                submitBtn.disabled = false;
            }
        });
    }
});
