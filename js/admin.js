document.addEventListener('DOMContentLoaded', async () => {
    const reservationList = document.getElementById('reservationList');
    
    // 🔥 알려주신 Worker 주소로 API 엔드포인트 설정 완료
    const WORKER_URL = 'https://reservation-api.tonycho999.workers.dev/api/reservations';

    try {
        const response = await fetch(WORKER_URL);
        const data = await response.json();

        reservationList.innerHTML = ''; // 기존 예시 데이터 삭제

        if (data.length === 0) {
            reservationList.innerHTML = '<tr><td colspan="5">예약 내역이 없습니다.</td></tr>';
            return;
        }

        data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.phone}</td>
                <td>${item.people}명</td>
                <td><span class="status confirm">${item.status || '예약완료'}</span></td>
            `;
            reservationList.appendChild(row);
        });
    } catch (error) {
        console.error('Error:', error);
        reservationList.innerHTML = '<tr><td colspan="5">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
});
