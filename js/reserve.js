document.addEventListener('DOMContentLoaded', () => {
    const reserveForm = document.getElementById('reserveForm');

    if (reserveForm) {
        reserveForm.addEventListener('submit', (e) => {
            e.preventDefault(); // 페이지 새로고침 방지

            // 입력 데이터 가져오기
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const people = document.getElementById('people').value;
            const date = document.getElementById('date').value;

            // 간단한 안내 메시지 (Cloudflare Pages 정적 환경 시뮬레이션)
            alert(`예약이 접수되었습니다!\n\n이름: ${name}\n연락처: ${phone}\n인원: ${people}명\n날짜: ${date}\n\n* 실제 데이터 저장을 위해서는 백엔드(DB) 연동이 필요합니다.`);
            
            // 폼 초기화
            reserveForm.reset();
        });
    }
});
