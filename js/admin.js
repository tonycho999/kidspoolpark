document.addEventListener('DOMContentLoaded', async () => {
    const reservationList = document.getElementById('reservationList');
    const searchInput = document.getElementById('searchInput'); // 검색창
    
    const GET_URL = 'https://reservation-api.tonycho999.workers.dev/api/reservations';
    const UPDATE_URL = 'https://reservation-api.tonycho999.workers.dev/api/update-status';

    let allReservations = []; // 서버에서 불러온 전체 데이터를 저장할 배열

    // 리스트를 화면에 그리는 함수
    function renderTable(dataToRender) {
        reservationList.innerHTML = ''; 

        if (dataToRender.length === 0) {
            reservationList.innerHTML = '<tr><td colspan="5">일치하는 예약 내역이 없습니다.</td></tr>';
            return;
        }

        dataToRender.forEach(item => {
            const row = document.createElement('tr');
            const currentStatus = item.status || '예약대기';

            row.innerHTML = `
                <td>${item.date}</td>
                <td>${item.name}</td>
                <td>${item.phone}</td>
                <td>${item.people}명</td>
                <td>
                    <select class="status-select" data-id="${item.id}">
                        <option value="예약대기" ${currentStatus === '예약대기' ? 'selected' : ''}>예약대기</option>
                        <option value="예약완료" ${currentStatus === '예약완료' ? 'selected' : ''}>예약완료</option>
                        <option value="예약취소" ${currentStatus === '예약취소' ? 'selected' : ''}>예약취소</option>
                    </select>
                </td>
            `;
            reservationList.appendChild(row);
        });

        // 선택 박스 이벤트 리스너 다시 달아주기
        attachSelectListeners();
    }

    // 상태 변경 이벤트 연결 함수
    function attachSelectListeners() {
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
                        // DB 업데이트 성공 시, 배열의 상태도 업데이트 (검색 시 유지되도록)
                        const itemToUpdate = allReservations.find(item => item.id == reservationId);
                        if (itemToUpdate) itemToUpdate.status = newStatus;
                        
                        alert('상태가 변경되었습니다.');
                    } else {
                        alert('상태 변경에 실패했습니다.');
                        location.reload(); 
                    }
                } catch (error) {
                    alert('네트워크 오류가 발생했습니다.');
                    location.reload();
                }
            });
        });
    }

    // 초기 데이터 로드
    try {
        const response = await fetch(GET_URL);
        const data = await response.json();

        // ⭐️ 1. 예약일자(date) 기준으로 오름차순(가까운 날짜순) 정렬
        allReservations = data.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 처음 화면에 그리기
        renderTable(allReservations);

    } catch (error) {
        console.error('Error:', error);
        reservationList.innerHTML = '<tr><td colspan="5">데이터를 불러오는 데 실패했습니다.</td></tr>';
    }

    // ⭐️ 2. 검색 기능 (키보드를 칠 때마다 즉시 필터링)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase().trim();
            
            // 이름이나 연락처에 키워드가 포함된 데이터만 걸러내기
            const filteredData = allReservations.filter(item => {
                const nameMatch = item.name && item.name.toLowerCase().includes(keyword);
                const phoneMatch = item.phone && item.phone.includes(keyword);
                return nameMatch || phoneMatch;
            });

            // 필터링된 데이터만 다시 화면에 그리기
            renderTable(filteredData);
        });
    }
});
