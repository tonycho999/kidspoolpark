document.addEventListener('DOMContentLoaded', async () => {
    const reservationList = document.getElementById('reservationList');
    
    // API 주소 설정
    const GET_URL = 'https://reservation-api.tonycho999.workers.dev/api/reservations';
    const UPDATE_URL = 'https://reservation-api.tonycho999.workers.dev/api/update-status';

    try {
        // DB에서 데이터 불러오기
        const response = await fetch(GET_URL);
        const data = await response.json();

        reservationList.innerHTML = ''; 

        if (data.length === 0) {
            reservationList.innerHTML = '<tr><td colspan="5">예약 내역이 없습니다.</td></tr>';
            return;
        }

        // 리스트 그리기
        data.forEach(item => {
            const row = document.createElement('tr');
            
            // 상태(status)가 비어있으면 '예약대기'로 처리
            const currentStatus = item.status || '예약대기';

            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.phone}</td>
                <td>${item.people}명</td>
                <td>
                    <!-- ⭐️ 글자 대신 선택 박스(Select)를 만듭니다 -->
                    <select class="status-select" data-id="${item.id}">
                        <option value="예약대기" ${currentStatus === '예약대기' ? 'selected' : ''}>예약대기</option>
                        <option value="예약완료" ${currentStatus === '예약완료' ? 'selected' : ''}>예약완료</option>
                        <option value="예약취소" ${currentStatus === '예약취소' ? 'selected' : ''}>예약취소</option>
                    </select>
                </td>
            `;
            reservationList.appendChild(row);
        });

        // ⭐️ 선택 박스 값이 바뀔 때마다 DB 업데이트 API 호출하기
        document.querySelectorAll('.status-select').forEach(selectElement => {
            selectElement.addEventListener('change', async (e) => {
                const reservationId = e.target.getAttribute('data-id');
                const newStatus = e.target.value;

                try {
                    const updateRes = await fetch(UPDATE_URL, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: reservationId, status: newStatus })
                    });

                    if (updateRes.ok) {
                        alert('상태가 변경되었습니다.');
                    } else {
                        alert('상태 변경에 실패했습니다.');
                        // 실패 시 원래 값으로 되돌리기 (새로고침)
                        location.reload(); 
                    }
                } catch (error) {
                    alert('네트워크 오류가 발생했습니다.');
                    location.reload();
                }
            });
        });

    } catch (error) {
        console.error('Error:', error);
        reservationList.innerHTML = '<tr><td colspan="5">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }
});
